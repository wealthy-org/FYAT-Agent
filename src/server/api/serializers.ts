import "server-only";
import { getMandateStatus, type Mandate, type Vault } from "../models";
import type { ReceiptDto } from "@/features/receipts/types";
import type { ReceiptWithSession } from "../models";


export function serializeVault(vault: Vault) {
  return {
    id: vault.id,
    ownerPubkey: vault.ownerPubkey,
    vaultPda: vault.vaultPda,
    tokenMint: vault.tokenMint,
    createdAt: vault.createdAt.toISOString(),
  };
}

export function serializeMandate(mandate: Mandate) {
  return {
    id: mandate.id,
    vaultId: mandate.vaultId,
    sessionPubkey: mandate.sessionPubkey,
    action: mandate.action,
    target: mandate.target,
    maxPerAction: mandate.maxPerAction.toString(),
    maxTotal: mandate.maxTotal.toString(),
    spent: mandate.spent.toString(),
    status: getMandateStatus(mandate),
    expiresAt: mandate.expiresAt.toISOString(),
    revokedAt: mandate.revokedAt?.toISOString() ?? null,
    createdAt: mandate.createdAt.toISOString(),
  };
}

export function serializeReceipt(receipt: ReceiptWithSession): ReceiptDto {
  return {
    id: receipt.id,
    sessionPubkey: receipt.sessionPubkey,
    action: receipt.action,
    amount: receipt.amount.toString(),
    status: receipt.status,
    reason: receipt.reason,
    txSignature: receipt.txSignature,
    createdAt: receipt.createdAt.toISOString(),
  };
}