import "server-only";

import { getMandateStatus, type Mandate, type Vault } from "../models";

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