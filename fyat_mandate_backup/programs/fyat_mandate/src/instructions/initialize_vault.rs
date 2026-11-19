use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::VAULT_SEED;
use crate::state::Vault;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    /// Hanya mint SPL Token klasik: `Account<Mint>` memeriksa pemilik akunnya.
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = owner,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED, owner.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    /// Tempat dana disimpan. Otoritasnya adalah PDA vault, jadi hanya program ini yang bisa memindahkannya.
    #[account(
        init,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    vault.owner = ctx.accounts.owner.key();
    vault.mint = ctx.accounts.mint.key();
    vault.next_mandate_id = 0;
    vault.bump = ctx.bumps.vault;

    Ok(())
}