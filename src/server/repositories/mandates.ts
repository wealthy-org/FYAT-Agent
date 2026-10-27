import "server-only";

import type { MandateAction } from "@/features/builder";

import { firstRow, query, requireRow } from "../db/client";
import { toBigInt, toDate } from "../db/mappers";
import type { Mandate } from "../models";

type MandateRow = {
  id: string;
  vault_id: string;
  session_pubkey: string;
  allowed_action: MandateAction;
  allowed_target: string;
  max_amount_per_action: string;
  max_total_budget: string;
  current_spent: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  created_at: Date | string;
};

const COLUMNS = `
  m.id, m.vault_id, m.session_pubkey, m.allowed_action, m.allowed_target,
  m.max_amount_per_action, m.max_total_budget, m.current_spent,
  m.expires_at, m.revoked_at, m.created_at`;

function toMandate(row: MandateRow): Mandate {
  return {
    id: row.id,
    vaultId: row.vault_id,
    sessionPubkey: row.session_pubkey,
    action: row.allowed_action,
    target: row.allowed_target,
    maxPerAction: toBigInt(row.max_amount_per_action),
    maxTotal: toBigInt(row.max_total_budget),
    spent: toBigInt(row.current_spent),
    expiresAt: toDate(row.expires_at),
    revokedAt: row.revoked_at ? toDate(row.revoked_at) : null,
    createdAt: toDate(row.created_at),
  };
}

export type NewMandate = {
  vaultId: string;
  sessionPubkey: string;
  action: MandateAction;
  target: string;
  maxPerAction: bigint;
  maxTotal: bigint;
  expiresAt: Date;
};

export async function insertMandate(input: NewMandate): Promise<Mandate> {
  const rows = await query<MandateRow>(
    `INSERT INTO mandates AS m
       (vault_id, session_pubkey, allowed_action, allowed_target,
        max_amount_per_action, max_total_budget, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNS}`,
    [
      input.vaultId,
      input.sessionPubkey,
      input.action,
      input.target,
      input.maxPerAction.toString(),
      input.maxTotal.toString(),
      input.expiresAt.toISOString(),
    ],
  );

  return toMandate(requireRow(rows));
}

/** `id` harus UUID valid. Validasi dengan zod di route (Step 8) sebelum memanggil ini. */
export async function findMandateById(id: string): Promise<Mandate | null> {
  const rows = await query<MandateRow>(
    `SELECT ${COLUMNS} FROM mandates AS m WHERE m.id = $1`,
    [id],
  );

  const row = firstRow(rows);
  return row ? toMandate(row) : null;
}

/**
 * Revoke hanya berhasil bila `ownerPubkey` adalah pemilik vault-nya
 * dan mandate belum pernah di-revoke. Hasil null = tidak ada yang berubah.
 */
export async function revokeMandate(input: {
  mandateId: string;
  ownerPubkey: string;
}): Promise<Mandate | null> {
  const rows = await query<MandateRow>(
    `UPDATE mandates AS m
        SET revoked_at = now()
       FROM vaults AS v
      WHERE m.id = $1
        AND m.vault_id = v.id
        AND v.owner_pubkey = $2
        AND m.revoked_at IS NULL
      RETURNING ${COLUMNS}`,
    [input.mandateId, input.ownerPubkey],
  );

  const row = firstRow(rows);
  return row ? toMandate(row) : null;
}