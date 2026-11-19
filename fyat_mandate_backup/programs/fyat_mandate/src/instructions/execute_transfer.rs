use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};

use crate::constants::{MANDATE_SEED, VAULT_SEED};
use crate::errors::FyatError;
use crate::events::TransferExecuted;
use crate::state::{Action, Mandate, Vault};

#[derive(Accounts)]
pub struct ExecuteTransfer<'info> {
    /// Session key milik agent. Bukan kunci owner.
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

    /// Harus token account MILIK penerima yang disetujui di mandate. Mengirim ke wallet
    /// agent sendiri (atau siapa pun selain penerima) gagal di constraint ini.
    #[account(
        mut,
        token::mint = mint,
        constraint = destination_token_account.owner == mandate.recipient
            @ FyatError::DestinationNotAllowed,
    )]
    pub destination_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_execute_transfer(ctx: Context<ExecuteTransfer>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    let new_spent = {
        let mandate = &ctx.accounts.mandate;

        require!(amount > 0, FyatError::ZeroAmount);
        require!(mandate.action == Action::Transfer, FyatError::UnsupportedAction);
        require!(!mandate.is_revoked(), FyatError::MandateIsRevoked);
        require!(now < mandate.expires_at, FyatError::MandateExpired);
        require!(
            amount <= mandate.max_per_action,
            FyatError::ExceedsPerActionLimit
        );

        let new_spent = mandate
            .spent
            .checked_add(amount)
            .ok_or(FyatError::MathOverflow)?;
        require!(new_spent <= mandate.max_total, FyatError::ExceedsTotalBudget);

        new_spent
    };

    // Efek lebih dulu: bila transfer di bawah gagal, seluruh transaksi dibatalkan.
    ctx.accounts.mandate.spent = new_spent;

    let owner = ctx.accounts.vault.owner;
    let mint = ctx.accounts.vault.mint;
    let bump = [ctx.accounts.vault.bump];
    let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, owner.as_ref(), mint.as_ref(), &bump]];

    let accounts = TransferChecked {
        from: ctx.accounts.vault_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.destination_token_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx =
        CpiContext::new_with_signer(ctx.accounts.token_program.key(), accounts, signer_seeds);

    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    emit!(TransferExecuted {
        mandate: ctx.accounts.mandate.key(),
        session: ctx.accounts.session.key(),
        destination: ctx.accounts.destination_token_account.key(),
        amount,
        spent: new_spent,
    });

    Ok(())
}
