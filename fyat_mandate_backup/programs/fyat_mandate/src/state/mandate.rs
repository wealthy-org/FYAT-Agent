use anchor_lang::prelude::*;

/// Aksi yang boleh dilakukan session key. `Swap` ditambahkan di Step 15 (varian baru,
/// layout data lama tetap valid).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Action {
    Transfer,
}

#[account]
#[derive(InitSpace)]
pub struct Mandate {
    pub vault: Pubkey,
    /// Nomor urut di vault; bagian dari seed PDA.
    pub id: u64,
    /// Kunci sementara milik agent. Satu-satunya yang boleh memanggil execute.
    pub session: Pubkey,
    /// Pemilik token account tujuan yang diizinkan.
    pub recipient: Pubkey,
    pub action: Action,
    pub max_per_action: u64,
    pub max_total: u64,
    /// Total yang sudah dikeluarkan. Hanya naik.
    pub spent: u64,
    pub created_at: i64,
    pub expires_at: i64,
    /// 0 = belum dicabut. Selain itu: waktu pencabutan (unix).
    pub revoked_at: i64,
    pub bump: u8,
}

impl Mandate {
    pub fn is_revoked(&self) -> bool {
        self.revoked_at != 0
    }
}
