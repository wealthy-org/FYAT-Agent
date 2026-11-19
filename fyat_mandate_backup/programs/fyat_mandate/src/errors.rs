use anchor_lang::prelude::*;

/// Urutan varian menentukan kode error. Tambahkan varian baru HANYA di akhir.
#[error_code]
pub enum FyatError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Signer is not the vault owner")]
    NotVaultOwner,
    #[msg("Per-action cap must be positive and not exceed the total budget")]
    InvalidLimits,
    #[msg("Expiry must be in the future and within 30 days")]
    InvalidExpiry,
    #[msg("The session key must differ from the owner")]
    SessionIsOwner,
    #[msg("The recipient cannot be the session key")]
    RecipientIsSession,
    #[msg("The recipient cannot be the vault")]
    RecipientIsVault,
    #[msg("Signer is not the mandate's session key")]
    NotSessionSigner,
    #[msg("Mandate action is not supported by this instruction")]
    UnsupportedAction,
    #[msg("Mandate has been revoked")]
    MandateIsRevoked,
    #[msg("Mandate has already been revoked")]
    MandateAlreadyRevoked,
    #[msg("Mandate has expired")]
    MandateExpired,
    #[msg("Amount exceeds the per-action limit")]
    ExceedsPerActionLimit,
    #[msg("Amount exceeds the remaining total budget")]
    ExceedsTotalBudget,
    #[msg("Destination is not the mandate's approved recipient")]
    DestinationNotAllowed,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Pool is not the mandate's approved pool")]
    PoolNotAllowed,
    #[msg("Swap accounts do not match the vault or the pool")]
    InvalidSwapAccounts,
    #[msg("Swap spent more than the requested input amount")]
    SwapOverspent,
    #[msg("Swap output is below the minimum amount out")]
    SlippageExceeded,
}
