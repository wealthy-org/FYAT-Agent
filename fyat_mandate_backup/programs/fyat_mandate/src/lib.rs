// Peringatan palsu dari makro #[program] pada Anchor 1.x (hanya memengaruhi clippy).
#![allow(clippy::diverging_sub_expression)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Eu1b76PNqv5B8HbTsxrmirM3NfRy51bscQ5eUzgZVU6Y");

#[program]
pub mod fyat_mandate {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault::handle_initialize_vault(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handle_deposit(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handle_withdraw(ctx, amount)
    }

    pub fn create_mandate(
        ctx: Context<CreateMandate>,
        params: CreateMandateParams,
    ) -> Result<()> {
        instructions::create_mandate::handle_create_mandate(ctx, params)
    }

    pub fn revoke_mandate(ctx: Context<RevokeMandate>) -> Result<()> {
        instructions::revoke_mandate::handle_revoke_mandate(ctx)
    }

    pub fn execute_transfer(ctx: Context<ExecuteTransfer>, amount: u64) -> Result<()> {
        instructions::execute_transfer::handle_execute_transfer(ctx, amount)
    }
}
