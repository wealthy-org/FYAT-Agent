use anchor_lang::prelude::*;

use crate::constants::{MANDATE_SEED, MAX_MANDATE_DURATION_SECS, VAULT_SEED};
use crate::errors::FyatError;
use crate::events::MandateCreated;
use crate::state::{Action, Mandate, Vault};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateMandateParams {
    pub session: Pubkey,
    pub recipient: Pubkey,
    pub max_per_action: u64,
    pub max_total: u64,
    pub expires_at: i64,
}

#[derive(Accounts)]
pub struct CreateMandate<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [VAULT_SEED, vault.owner.as_ref(), vault.mint.as_ref()],
        bump = vault.bump,
        has_one = owner @ FyatError::NotVaultOwner,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = owner,
        space = 8 + Mandate::INIT_SPACE,
        seeds = [MANDATE_SEED, vault.key().as_ref(), vault.next_mandate_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub mandate: Account<'info, Mandate>,

    pub system_program: Program<'info, System>,
}

pub fn handle_create_mandate(
    ctx: Context<CreateMandate>,
    params: CreateMandateParams,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let owner_key = ctx.accounts.owner.key();
    let vault_key = ctx.accounts.vault.key();
    let mandate_key = ctx.accounts.mandate.key();
    let mandate_bump = ctx.bumps.mandate;

    require!(
        params.max_per_action > 0 && params.max_per_action <= params.max_total,
        FyatError::InvalidLimits
    );

    let latest_expiry = now
        .checked_add(MAX_MANDATE_DURATION_SECS)
        .ok_or(FyatError::MathOverflow)?;
    require!(
        params.expires_at > now && params.expires_at <= latest_expiry,
        FyatError::InvalidExpiry
    );

    // Agent tidak boleh memegang kunci owner, dan tidak boleh menjadi penerima dananya sendiri.
    require_keys_neq!(params.session, owner_key, FyatError::SessionIsOwner);
    require_keys_neq!(params.recipient, params.session, FyatError::RecipientIsSession);
    require_keys_neq!(params.recipient, vault_key, FyatError::RecipientIsVault);

    let vault = &mut ctx.accounts.vault;
    let mandate_id = vault.next_mandate_id;
    vault.next_mandate_id = mandate_id.checked_add(1).ok_or(FyatError::MathOverflow)?;

    ctx.accounts.mandate.set_inner(Mandate {
        vault: vault_key,
        id: mandate_id,
        session: params.session,
        recipient: params.recipient,
        action: Action::Transfer,
        max_per_action: params.max_per_action,
        max_total: params.max_total,
        spent: 0,
        created_at: now,
        expires_at: params.expires_at,
        revoked_at: 0,
        bump: mandate_bump,
    });

    emit!(MandateCreated {
        vault: vault_key,
        mandate: mandate_key,
        id: mandate_id,
        session: params.session,
        recipient: params.recipient,
        max_per_action: params.max_per_action,
        max_total: params.max_total,
        expires_at: params.expires_at,
    });

    Ok(())
}
