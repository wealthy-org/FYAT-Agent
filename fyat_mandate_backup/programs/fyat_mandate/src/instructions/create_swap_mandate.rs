use anchor_lang::prelude::*;

use super::create_mandate::{
    handle_create_mandate_with_action, CreateMandate, CreateMandateParams,
};
use crate::state::Action;

pub fn handle_create_swap_mandate(
    ctx: Context<CreateMandate>,
    params: CreateMandateParams,
) -> Result<()> {
    handle_create_mandate_with_action(ctx, params, Action::Swap)
}
