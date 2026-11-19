/// Seed ini HARUS identik dengan `VAULT_SEED` di `src/lib/vault-address.ts` pada aplikasi web.
pub const VAULT_SEED: &[u8] = b"vault";

/// Seed PDA mandate: ["mandate", vault, id (u64 little-endian)].
pub const MANDATE_SEED: &[u8] = b"mandate";

/// Batas atas umur mandate. Batas di web hanya UX, program tidak mempercayai klien.
pub const MAX_MANDATE_DURATION_SECS: i64 = 30 * 24 * 60 * 60;
