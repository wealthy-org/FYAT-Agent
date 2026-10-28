import "server-only";

import { Connection } from "@solana/web3.js";

import { findVaultPda } from "@/lib/vault-address";

import { readMandate } from "./mandate-reader";
import { assertOwnerInstruction } from "./verify-tx";
import { VerificationError } from "./verify-create";

/** Discriminator instruksi revoke_mandate dari IDL. */
const REVOKE_MANDATE_DISCRIMINATOR = [252, 97, 140, 119, 67, 43, 177, 108];

export async function verifyRevoke(
  connection: Connection,
  claim: {
    ownerWallet: string;
    mint: string;
    programId: string;
    mandatePda: string;
    revokeSignature: string;
  },
): Promise<{ revokedAt: bigint }> {
  const onchain = await readMandate(connection, {
    mandatePda: claim.mandatePda,
    programId: claim.programId,
  });

  const vaultPda = findVaultPda({
    owner: claim.ownerWallet,
    mint: claim.mint,
    programId: claim.programId,
  });
  if (onchain.vault !== vaultPda) {
    throw new VerificationError("Mandate does not belong to your vault");
  }
  if (onchain.revokedAt === 0n) {
    throw new VerificationError("Mandate is not revoked onchain");
  }

  await assertOwnerInstruction(connection, {
    signature: claim.revokeSignature,
    owner: claim.ownerWallet,
    programId: claim.programId,
    discriminator: REVOKE_MANDATE_DISCRIMINATOR,
    account: claim.mandatePda,
  });

  return { revokedAt: onchain.revokedAt };
}