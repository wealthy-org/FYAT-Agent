import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

/** Meteora DAMM v2 (cp-amm). ID yang sama di Devnet dan Mainnet. */
export const DAMM_PROGRAM_ID = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG";

const POOL_AUTHORITY_SEED = "pool_authority";
const EVENT_AUTHORITY_SEED = "__event_authority";

const encoder = new TextEncoder();

function deriveDammPda(seed: string): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [encoder.encode(seed)],
    new PublicKey(DAMM_PROGRAM_ID),
  );
  return address;
}

export function derivePoolAuthority(): PublicKey {
  return deriveDammPda(POOL_AUTHORITY_SEED);
}

export function deriveEventAuthority(): PublicKey {
  return deriveDammPda(EVENT_AUTHORITY_SEED);
}

/**
 * Token account milik vault untuk `mint` (ATA dengan pemilik off-curve).
 * Untuk token output swap, akun ini HARUS sudah ada sebelum execute_swap.
 */
export function deriveVaultTokenAccount(
  vaultPda: string,
  mint: string,
): PublicKey {
  return getAssociatedTokenAddressSync(
    new PublicKey(mint),
    new PublicKey(vaultPda),
    true,
  );
}