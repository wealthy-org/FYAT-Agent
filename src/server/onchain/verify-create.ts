import "server-only";

import { Connection } from "@solana/web3.js";

import { findVaultPda } from "@/lib/vault-address";

import { readMandate, type OnchainMandate } from "./mandate-reader";
import { VerificationError } from "./verification-error";
import { assertOwnerInstruction } from "./verify-tx";

// Nama lama tetap bisa diimpor dari file ini.
export { VerificationError };

/** Discriminator instruksi create_mandate dari IDL. */
export const CREATE_MANDATE_DISCRIMINATOR = [230, 170, 158, 68, 33, 169, 16, 158];

/**
 * Klien menghitung expiresAt sebelum Phantom menyetujui, sedangkan created_at
 * dicatat saat transaksi masuk blok. Selisihnya beberapa detik sampai menit.
 */
const EXPIRY_TOLERANCE_SECONDS = 600n;

export type CreateClaim = {
  ownerWallet: string; // wallet yang menandatangani request API (dari auth)
  mint: string; // dari env server, bukan dari klien
  programId: string;
  mandatePda: string;
  createSignature: string;
  sessionPubkey: string;
  config: {
    action: "TRANSFER";
    recipient: string;
    maxPerAction: bigint;
    maxTotal: bigint;
    expiresInHours: number;
  };
};

export type VerifiedCreate = {
  vaultPda: string;
  onchain: OnchainMandate;
};

function fail(message: string): never {
  throw new VerificationError(message);
}

export async function verifyCreate(
  connection: Connection,
  claim: CreateClaim,
): Promise<VerifiedCreate> {
  /* 1. Vault diturunkan dari owner penanda tangan. Seed memuat owner,
        jadi vault orang lain tidak mungkin cocok. */
  const vaultPda = findVaultPda({
    owner: claim.ownerWallet,
    mint: claim.mint,
    programId: claim.programId,
  });

  /* 2. Akun mandate asli, dimiliki program, PDA cocok dengan (vault, id). */
  const onchain = await readMandate(connection, {
    mandatePda: claim.mandatePda,
    programId: claim.programId,
  });

  if (onchain.vault !== vaultPda) fail("Mandate does not belong to your vault");

  /* 3. Isi akun harus sama dengan config yang dikirim klien. */
  if (onchain.session !== claim.sessionPubkey) fail("Session key mismatch");
  if (onchain.recipient !== claim.config.recipient) fail("Recipient mismatch");
  if (onchain.maxPerAction !== claim.config.maxPerAction) fail("Per-action cap mismatch");
  if (onchain.maxTotal !== claim.config.maxTotal) fail("Total budget mismatch");

  const lifetime = onchain.expiresAt - onchain.createdAt;
  const expected = BigInt(claim.config.expiresInHours) * 3600n;
  const drift = lifetime > expected ? lifetime - expected : expected - lifetime;
  if (drift > EXPIRY_TOLERANCE_SECONDS) fail("Expiry mismatch");

  if (onchain.revokedAt !== 0n) fail("Mandate is already revoked");
  if (onchain.spent !== 0n) fail("Mandate is not fresh");

    /* 4. Signature: transaksi sukses yang memanggil create_mandate,
        ditandatangani owner, dan menyebut PDA ini. */
  await assertOwnerInstruction(connection, {
    signature: claim.createSignature,
    owner: claim.ownerWallet,
    programId: claim.programId,
    discriminator: CREATE_MANDATE_DISCRIMINATOR,
    account: claim.mandatePda,
  });
}