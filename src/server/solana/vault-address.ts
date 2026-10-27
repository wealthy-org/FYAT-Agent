import "server-only";

import { findVaultPda } from "@/lib/vault-address";

import { getServerEnv } from "../env";

export function deriveVaultAddress(ownerPubkey: string): string {
  const { FYAT_PROGRAM_ID, TOKEN_MINT } = getServerEnv();

  return findVaultPda({
    owner: ownerPubkey,
    mint: TOKEN_MINT,
    programId: FYAT_PROGRAM_ID,
  });
}