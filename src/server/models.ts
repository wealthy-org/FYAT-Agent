import type { MandateAction } from "@/features/builder";

export type Vault = {
  id: string;
  ownerPubkey: string;
  vaultPda: string;
  tokenMint: string;
  createdAt: Date;
};

export type MandateStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export type Mandate = {
  id: string;
  vaultId: string;
  sessionPubkey: string;
  action: MandateAction;
  /** Kode venue (SWAP) atau alamat recipient (TRANSFER). */
  target: string;
  maxPerAction: bigint;
  maxTotal: bigint;
  spent: bigint;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export const RECEIPT_STATUSES = [
  "SUCCESS",
  "REJECTED_BY_POLICY",
  "FAILED_SIMULATION",
] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export type Receipt = {
  id: string;
  mandateId: string;
  action: MandateAction;
  amount: bigint;
  target: string;
  txSignature: string | null;
  status: ReceiptStatus;
  reason: string | null;
  createdAt: Date;
};

/** Bentuk untuk Receipts feed publik (Step 10). */
export type ReceiptWithSession = Receipt & { sessionPubkey: string };

/** Status dihitung, bukan disimpan, jadi tidak pernah basi. */
export function getMandateStatus(
  mandate: Pick<Mandate, "revokedAt" | "expiresAt">,
  now: Date = new Date(),
): MandateStatus {
  if (mandate.revokedAt) return "REVOKED";
  if (mandate.expiresAt <= now) return "EXPIRED";
  return "ACTIVE";
}