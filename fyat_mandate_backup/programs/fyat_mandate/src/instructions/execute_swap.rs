use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{DAMM_V2_PROGRAM_ID, MANDATE_SEED, VAULT_SEED};
use crate::errors::FyatError;
use crate::events::SwapExecuted;
use crate::state::{Action, Mandate, Vault};

const POOL_AUTHORITY_SEED: &[u8] = b"pool_authority";
const EVENT_AUTHORITY_SEED: &[u8] = b"__event_authority";
const SWAP2_DISCRIMINATOR: [u8; 8] = [65, 75, 63, 76, 235, 91, 91, 136];
const SWAP_MODE_EXACT_IN: u8 = 0;
const INSTRUCTIONS_SYSVAR_ID: Pubkey =
    anchor_lang::prelude::pubkey!("Sysvar1nstructions1111111111111111111111111");

#[derive(Accounts)]
pub struct ExecuteSwap<'info> {
    /// Session key milik agent.
    pub session: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, vault.owner.as_ref(), vault.mint.as_ref()],
        bump = vault.bump,
        has_one = mint,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [MANDATE_SEED, vault.key().as_ref(), mandate.id.to_le_bytes().as_ref()],
        bump = mandate.bump,
        has_one = vault,
        has_one = session @ FyatError::NotSessionSigner,
    )]
    pub mandate: Account<'info, Mandate>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub output_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = output_mint,
        associated_token::authority = vault,
    )]
    pub vault_output_token_account: Account<'info, TokenAccount>,

    /// Pool yang diizinkan tersimpan pada `mandate.recipient`.
    /// CHECK: owner dan kecocokan pool juga divalidasi oleh program DAMM v2 saat CPI.
    #[account(mut, owner = DAMM_V2_PROGRAM_ID)]
    pub pool: UncheckedAccount<'info>,

    /// CHECK: PDA tetap milik program Meteora DAMM v2.
    #[account(
        seeds = [POOL_AUTHORITY_SEED],
        bump,
        seeds::program = amm_program.key(),
    )]
    pub pool_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = token_a_mint,
        token::authority = pool_authority,
    )]
    pub token_a_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_b_mint,
        token::authority = pool_authority,
    )]
    pub token_b_vault: Account<'info, TokenAccount>,

    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,

    /// CHECK: Event authority PDA divalidasi dari program Meteora.
    #[account(
        seeds = [EVENT_AUTHORITY_SEED],
        bump,
        seeds::program = amm_program.key(),
    )]
    pub event_authority: UncheckedAccount<'info>,

    /// CHECK: Alamat tetap program Meteora DAMM v2.
    #[account(address = DAMM_V2_PROGRAM_ID)]
    pub amm_program: UncheckedAccount<'info>,
}

pub fn handle_execute_swap<'info>(
    ctx: Context<'info, ExecuteSwap<'info>>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        amount_in > 0 && minimum_amount_out > 0,
        FyatError::ZeroAmount
    );
    require!(
        ctx.accounts.mandate.action == Action::Swap,
        FyatError::UnsupportedAction
    );
    require!(
        !ctx.accounts.mandate.is_revoked(),
        FyatError::MandateIsRevoked
    );
    require!(
        now < ctx.accounts.mandate.expires_at,
        FyatError::MandateExpired
    );
    require_keys_eq!(
        ctx.accounts.pool.key(),
        ctx.accounts.mandate.recipient,
        FyatError::PoolNotAllowed
    );
    require_keys_neq!(
        ctx.accounts.mint.key(),
        ctx.accounts.output_mint.key(),
        FyatError::InvalidSwapAccounts
    );

    let input_is_a = ctx.accounts.token_a_mint.key() == ctx.accounts.mint.key();
    let pair_matches = if input_is_a {
        ctx.accounts.token_b_mint.key() == ctx.accounts.output_mint.key()
    } else {
        ctx.accounts.token_b_mint.key() == ctx.accounts.mint.key()
            && ctx.accounts.token_a_mint.key() == ctx.accounts.output_mint.key()
    };
    require!(pair_matches, FyatError::InvalidSwapAccounts);
    require_keys_eq!(
        *ctx.accounts.pool.owner,
        DAMM_V2_PROGRAM_ID,
        FyatError::InvalidSwapAccounts
    );
    require_keys_eq!(
        ctx.accounts.token_program.key(),
        anchor_spl::token::ID,
        FyatError::InvalidSwapAccounts
    );

    let mandate = &ctx.accounts.mandate;
    require!(
        amount_in <= mandate.max_per_action,
        FyatError::ExceedsPerActionLimit
    );
    let requested_total = mandate
        .spent
        .checked_add(amount_in)
        .ok_or(FyatError::MathOverflow)?;
    require!(
        requested_total <= mandate.max_total,
        FyatError::ExceedsTotalBudget
    );

    let input_before = ctx.accounts.vault_token_account.amount;
    let output_before = ctx.accounts.vault_output_token_account.amount;

    // DAMM v2 `swap2` with ExactIn: amount_0 = amount_in,
    // amount_1 = minimum_amount_out, swap_mode = 0.
    let mut data = Vec::with_capacity(25);
    data.extend_from_slice(&SWAP2_DISCRIMINATOR);
    data.extend_from_slice(&amount_in.to_le_bytes());
    data.extend_from_slice(&minimum_amount_out.to_le_bytes());
    data.push(SWAP_MODE_EXACT_IN);

    let input_account = ctx.accounts.vault_token_account.to_account_info();
    let output_account = ctx.accounts.vault_output_token_account.to_account_info();
    let token_a_program = ctx.accounts.token_program.to_account_info();
    let token_b_program = ctx.accounts.token_program.to_account_info();
    let amm_program = ctx.accounts.amm_program.to_account_info();

    let (input_token_account, output_token_account) = (input_account, output_account);

    let mut metas = vec![
        AccountMeta::new_readonly(ctx.accounts.pool_authority.key(), false),
        AccountMeta::new(ctx.accounts.pool.key(), false),
        AccountMeta::new(input_token_account.key(), false),
        AccountMeta::new(output_token_account.key(), false),
        AccountMeta::new(ctx.accounts.token_a_vault.key(), false),
        AccountMeta::new(ctx.accounts.token_b_vault.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_a_mint.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_b_mint.key(), false),
        AccountMeta::new(ctx.accounts.vault.key(), true),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        // Anchor optional-account sentinel means no referral account.
        AccountMeta::new_readonly(ctx.accounts.amm_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.event_authority.key(), false),
        AccountMeta::new_readonly(ctx.accounts.amm_program.key(), false),
    ];

    // Rate-limiter DAMM pools may inspect the instructions sysvar. Only forward that
    // well-known sysvar; reject arbitrary extra accounts from the session key.
    for account in ctx.remaining_accounts {
        require_keys_eq!(
            *account.key,
            INSTRUCTIONS_SYSVAR_ID,
            FyatError::InvalidSwapAccounts
        );
        metas.push(AccountMeta::new_readonly(*account.key, false));
    }

    let instruction = Instruction {
        program_id: DAMM_V2_PROGRAM_ID,
        accounts: metas,
        data,
    };

    let owner = ctx.accounts.vault.owner;
    let mint = ctx.accounts.vault.mint;
    let bump = [ctx.accounts.vault.bump];
    let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, owner.as_ref(), mint.as_ref(), &bump]];

    let account_infos = vec![
        ctx.accounts.pool_authority.to_account_info(),
        ctx.accounts.pool.to_account_info(),
        input_token_account,
        output_token_account,
        ctx.accounts.token_a_vault.to_account_info(),
        ctx.accounts.token_b_vault.to_account_info(),
        ctx.accounts.token_a_mint.to_account_info(),
        ctx.accounts.token_b_mint.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        token_a_program,
        token_b_program,
        // Optional referral sentinel followed by event authority and callee program.
        amm_program.clone(),
        ctx.accounts.event_authority.to_account_info(),
        amm_program,
    ];
    let mut cpi_infos = account_infos;
    cpi_infos.extend(ctx.remaining_accounts.iter().cloned());
    invoke_signed(&instruction, &cpi_infos, signer_seeds)?;

    ctx.accounts.vault_token_account.reload()?;
    ctx.accounts.vault_output_token_account.reload()?;
    let input_after = ctx.accounts.vault_token_account.amount;
    let output_after = ctx.accounts.vault_output_token_account.amount;
    let actual_spent = input_before
        .checked_sub(input_after)
        .ok_or(FyatError::InvalidSwapAccounts)?;
    let actual_out = output_after
        .checked_sub(output_before)
        .ok_or(FyatError::InvalidSwapAccounts)?;
    require!(actual_spent <= amount_in, FyatError::SwapOverspent);
    require!(
        actual_out >= minimum_amount_out,
        FyatError::SlippageExceeded
    );

    let spent = ctx
        .accounts
        .mandate
        .spent
        .checked_add(actual_spent)
        .ok_or(FyatError::MathOverflow)?;
    require!(
        spent <= ctx.accounts.mandate.max_total,
        FyatError::ExceedsTotalBudget
    );
    ctx.accounts.mandate.spent = spent;

    emit!(SwapExecuted {
        mandate: ctx.accounts.mandate.key(),
        session: ctx.accounts.session.key(),
        pool: ctx.accounts.pool.key(),
        amount_in: actual_spent,
        amount_out: actual_out,
        spent,
    });
    Ok(())
}
