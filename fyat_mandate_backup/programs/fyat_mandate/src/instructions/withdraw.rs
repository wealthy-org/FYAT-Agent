use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};

use crate::constants::VAULT_SEED;
use crate::errors::FyatError;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, vault.owner.as_ref(), vault.mint.as_ref()],
        bump = vault.bump,
        has_one = owner @ FyatError::NotVaultOwner,
        has_one = mint,
    )]
    pub vault: Account<'info, Vault>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Hanya ke token account MILIK owner sendiri. Frontend yang dibajak tidak bisa
    /// mengalihkan penarikan ke alamat lain.
    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(amount > 0, FyatError::ZeroAmount);

    let owner = ctx.accounts.vault.owner;
    let mint = ctx.accounts.vault.mint;
    let bump = [ctx.accounts.vault.bump];
    let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, owner.as_ref(), mint.as_ref(), &bump]];

    let accounts = TransferChecked {
        from: ctx.accounts.vault_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.owner_token_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx =
        CpiContext::new_with_signer(ctx.accounts.token_program.key(), accounts, signer_seeds);

    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)
}