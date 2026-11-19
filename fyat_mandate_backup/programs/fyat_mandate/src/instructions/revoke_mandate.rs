use anchor_lang::prelude::*;

use crate::constants::{MANDATE_SEED, VAULT_SEED};
use crate::errors::FyatError;
use crate::events::MandateRevoked;
use crate::state::{Mandate, Vault};

#[derive(Accounts)]
pub struct RevokeMandate<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [VAULT_SEED, vault.owner.as_ref(), vault.mint.as_ref()],
        bump = vault.bump,
        has_one = owner @ FyatError::NotVaultOwner,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [MANDATE_SEED, vault.key().as_ref(), mandate.id.to_le_bytes().as_ref()],
        bump = mandate.bump,
        has_one = vault,
    )]
    pub mandate: Account<'info, Mandate>,
}

pub fn handle_revoke_mandate(ctx: Context<RevokeMandate>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let mandate_key = ctx.accounts.mandate.key();
    let mandate = &mut ctx.accounts.mandate;

    require!(!mandate.is_revoked(), FyatError::MandateAlreadyRevoked);
    mandate.revoked_at = now;

    emit!(MandateRevoked {
        mandate: mandate_key,
        revoked_at: now,
    });

    Ok(())
}
