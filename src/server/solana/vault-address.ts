import "server-only";

import { PublicKey } from "@solana/web3.js";

import { getServerEnv } from "../env";

const VAULT_SEED = Buffer.from("vault");

/**
 * Vault PDA = f(owner, mint). Satu owner punya tepat satu vault per mint,
 * dan tidak ada yang bisa mendaftarkan PDA milik orang lain.
 *
 * PENTING: seed ini HARUS identik dengan seed program Anchor di Step 12.
 */
export function deriveVaultAddress(ownerPubkey: string): string {
  const { FYAT_PROGRAM_ID, TOKEN_MINT } = getServerEnv();

  const [pda] = PublicKey.findProgramAddressSync(
    [
      VAULT_SEED,
      new PublicKey(ownerPubkey).toBuffer(),
      new PublicKey(TOKEN_MINT).toBuffer(),
    ],
    new PublicKey(FYAT_PROGRAM_ID),
  );

  return pda.toBase58();
}