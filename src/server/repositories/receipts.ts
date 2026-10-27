import "server-only";

import type { MandateAction } from "@/features/builder";

import { firstRow, query, requireRow } from "../db/client";
import { toBigInt, toDate } from "../db/mappers";
import type { Receipt, ReceiptStatus, ReceiptWithSession } from "../models";

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;
/** Harus sama dengan CHECK pada kolom `reason`. */
const MAX_REASON_LENGTH = 280;

type ReceiptRow = {
  id: string;
  mandate_id: string;
  action: MandateAction;
  amount: string;
  target: string;
  tx_signature: string | null;
  status: ReceiptStatus;
  reason: string | null;
  created_at: Date | string;
};

type ReceiptWithSessionRow = ReceiptRow & { session_pubkey: string };

const COLUMNS = `
  r.id, r.mandate_id, r.action, r.amount, r.target,
  r.tx_signature, r.status, r.reason, r.created_at`;

function toReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    mandateId: row.mandate_id,
    action: row.action,
    amount: toBigInt(row.amount),
    target: row.target,
    txSignature: row.tx_signature,
    status: row.status,
    reason: row.reason,
    createdAt: toDate(row.created_at),
  };
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}

/**
 * Eksekusi sukses di bawah mandate: menaikkan `current_spent` DAN menulis
 * receipt dalam satu statement atomik. Hasil null = mandate menolak
 * (di-revoke, kedaluwarsa, atau melewati cap/budget). Pemanggil lalu
 * mencatat `recordRejection`.
 *
 * Catatan: ini cermin pembukuan. Penegak yang sebenarnya adalah program onchain (Step 12).
 */
export async function recordSuccess(input: {
  mandateId: string;
  amount: bigint;
  target: string;
  txSignature: string;
}): Promise<Receipt | null> {
  const rows = await query<ReceiptRow>(
    `WITH spent AS (
       UPDATE mandates
          SET current_spent = current_spent + $2::numeric
        WHERE id = $1
          AND revoked_at IS NULL
          AND expires_at > now()
          AND $2::numeric <= max_amount_per_action
          AND current_spent + $2::numeric <= max_total_budget
        RETURNING id, allowed_action
     )
     INSERT INTO mandate_receipts AS r
       (mandate_id, action, amount, target, tx_signature, status)
     SELECT id, allowed_action, $2::numeric, $3::text, $4::text, 'SUCCESS'
       FROM spent
     RETURNING ${COLUMNS}`,
    [input.mandateId, input.amount.toString(), input.target, input.txSignature],
  );

  const row = firstRow(rows);
  return row ? toReceipt(row) : null;
}

/** Mencatat percobaan yang ditolak. Tidak mengubah `current_spent`. */
export async function recordRejection(input: {
  mandateId: string;
  /** Aksi yang DICOBA agent, bisa berbeda dari aksi mandate. */
  action: MandateAction;
  amount: bigint;
  target: string;
  status: Exclude<ReceiptStatus, "SUCCESS">;
  reason: string;
}): Promise<Receipt> {
  const rows = await query<ReceiptRow>(
    `INSERT INTO mandate_receipts AS r
       (mandate_id, action, amount, target, status, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [
      input.mandateId,
      input.action,
      input.amount.toString(),
      input.target,
      input.status,
      input.reason.slice(0, MAX_REASON_LENGTH),
    ],
  );

  return toReceipt(requireRow(rows));
}

export async function listRecentReceipts(
  limit: number = DEFAULT_LIST_LIMIT,
): Promise<ReceiptWithSession[]> {
  const rows = await query<ReceiptWithSessionRow>(
    `SELECT ${COLUMNS}, m.session_pubkey
       FROM mandate_receipts AS r
       JOIN mandates AS m ON m.id = r.mandate_id
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $1`,
    [clampLimit(limit)],
  );

  return rows.map((row) => ({
    ...toReceipt(row),
    sessionPubkey: row.session_pubkey,
  }));
}