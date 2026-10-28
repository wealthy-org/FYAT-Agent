import "server-only";

import { Connection, PublicKey } from "@solana/web3.js";

import { findVaultPda } from "@/lib/vault-address";

import { readMandate, type OnchainMandate } from "./mandate-reader";

/** Discriminator instruksi create_mandate dari IDL. */
const CREATE_MANDATE_DISCRIMINATOR = [230, 170, 158, 68, 33, 169, 16, 158];

/**
 * Klien menghitung expiresAt sebelum Phantom menyetujui, sedangkan created_at
 * dicatat saat transaksi masuk blok. Selisihnya beberapa detik sampai menit.
 */
const EXPIRY_TOLERANCE_SECONDS = 600n;

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationError";
  }
}

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
  const tx = await connection.getTransaction(claim.createSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) fail("Create transaction not found");
  if (tx.meta?.err) fail("Create transaction failed onchain");

  const keys = tx.transaction.message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  });
  const owner = new PublicKey(claim.ownerWallet);
  const program = new PublicKey(claim.programId);
  const mandate = new PublicKey(claim.mandatePda);

  const ownerIndex = keys.staticAccountKeys.findIndex((k) => k.equals(owner));
  const requiredSigners = tx.transaction.message.header.numRequiredSignatures;
  if (ownerIndex < 0 || ownerIndex >= requiredSigners) {
    fail("Transaction was not signed by the owner");
  }

  const matched = tx.transaction.message.compiledInstructions.some((ix) => {
    const ixProgram = keys.get(ix.programIdIndex);
    if (!ixProgram?.equals(program)) return false;
    const startsWithDiscriminator = CREATE_MANDATE_DISCRIMINATOR.every(
      (byte, i) => ix.data[i] === byte,
    );
    if (!startsWithDiscriminator) return false;
    return ix.accountKeyIndexes.some((i) => keys.get(i)?.equals(mandate));
  });
  if (!matched) fail("Transaction is not a create_mandate for this account");

  return { vaultPda, onchain };
}