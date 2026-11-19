use anchor_lang::prelude::*;

#[event]
pub struct MandateCreated {
    pub vault: Pubkey,
    pub mandate: Pubkey,
    pub id: u64,
    pub session: Pubkey,
    pub recipient: Pubkey,
    pub max_per_action: u64,
    pub max_total: u64,
    pub expires_at: i64,
}

#[event]
pub struct MandateRevoked {
    pub mandate: Pubkey,
    pub revoked_at: i64,
}

#[event]
pub struct TransferExecuted {
    pub mandate: Pubkey,
    pub session: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
    pub spent: u64,
}

#[event]
pub struct SwapExecuted {
    pub mandate: Pubkey,
    pub session: Pubkey,
    pub pool: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub spent: u64,
}
