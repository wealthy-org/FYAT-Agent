use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    /// Satu-satunya kunci yang boleh deposit, withdraw, membuat dan mencabut mandate.
    pub owner: Pubkey,
    /// Mint token yang disimpan vault ini.
    pub mint: Pubkey,
    /// Id untuk mandate berikutnya. Hanya naik, tidak pernah turun (dipakai di 12b).
    pub next_mandate_id: u64,
    pub bump: u8,
}