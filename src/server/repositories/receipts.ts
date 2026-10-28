import "server-only";

import type { MandateAction } from "@/features/builder";

import { firstRow, isUniqueViolation, query, requireRow } from "../db/client";
import { toBigInt, toDate } from "../db/mappers";
import type { Receipt, ReceiptStatus, ReceiptWithSession } from "../models";

export type ReceiptCursor = { createdAt: string; id: string };

export type ReceiptPage = {
  items: ReceiptWithSession[];
  nextCursor: ReceiptCursor | null;
};

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
/**
 * Mencatat eksekusi yang SUDAH sukses di chain, dan menyelaraskan `current_spent`
 * dengan pengeluaran kumulatif menurut chain (hanya naik).
 *
 * Tidak ada pemeriksaan revoke, kedaluwarsa, atau budget di sini: chain yang
 * menegakkan semuanya saat transaksi terjadi, dan DB hanya cermin pembukuan.
 * Hasil null = signature ini sudah pernah dicatat, atau mandate tidak ada.
 */
export async function recordSuccess(input: {
  mandateId: string;
  amount: bigint;
  target: string;
  txSignature: string;
  /** Pengeluaran kumulatif mandate menurut chain saat pencatatan. */
  onchainSpent: bigint;
}): Promise<Receipt | null> {
  if (input.amount <= 0n) return null;

  try {
    const rows = await query<ReceiptRow>(
      `WITH signature_lock AS MATERIALIZED (
         SELECT pg_advisory_xact_lock(
           hashtextextended($4::text, 0)
         )
       ),
       recorded AS (
         UPDATE mandates AS m
            SET current_spent = GREATEST(m.current_spent, $5::numeric)
           FROM signature_lock
          WHERE m.id = $1
            AND NOT EXISTS (
              SELECT 1
                FROM mandate_receipts AS existing
               WHERE existing.tx_signature = $4
            )
         RETURNING m.id, m.allowed_action
       )
       INSERT INTO mandate_receipts AS r
         (mandate_id, action, amount, target, tx_signature, status)
       SELECT id, allowed_action, $2::numeric, $3::text, $4::text, 'SUCCESS'
         FROM recorded
       RETURNING ${COLUMNS}`,
      [
        input.mandateId,
        input.amount.toString(),
        input.target,
        input.txSignature,
        input.onchainSpent.toString(),
      ],
    );

    const row = firstRow(rows);
    return row ? toReceipt(row) : null;
  } catch (error) {
    // UNIQUE violation membatalkan seluruh statement, termasuk pembaruan `current_spent`.
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

/** Receipt untuk signature tertentu di bawah mandate tertentu. Dipakai agar pencatatan idempoten. */
export async function findReceiptBySignature(input: {
  mandateId: string;
  txSignature: string;
}): Promise<Receipt | null> {
  const rows = await query<ReceiptRow>(
    `SELECT ${COLUMNS}
       FROM mandate_receipts AS r
      WHERE r.mandate_id = $1
        AND r.tx_signature = $2`,
    [input.mandateId, input.txSignature],
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

type ReceiptPageRow = ReceiptWithSessionRow & { cursor_ts: string };

/**
 * Keyset pagination: halaman berikutnya dimulai tepat setelah (created_at, id) terakhir.
 * Mengambil limit + 1 baris untuk mengetahui apakah masih ada halaman lagi.
 */
export async function listReceiptsPage(
  options: { limit?: number; after?: ReceiptCursor | null } = {},
): Promise<ReceiptPage> {
  const limit = clampLimit(options.limit ?? DEFAULT_LIST_LIMIT);
  const after = options.after ?? null;

  const rows = await query<ReceiptPageRow>(
    `SELECT ${COLUMNS}, m.session_pubkey,
            to_char(r.created_at AT TIME ZONE 'UTC',
                    'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_ts
       FROM mandate_receipts AS r
       JOIN mandates AS m ON m.id = r.mandate_id
      WHERE $2::timestamptz IS NULL
         OR (r.created_at, r.id) < ($2::timestamptz, $3::uuid)
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $1`,
    [limit + 1, after?.createdAt ?? null, after?.id ?? null],
  );

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);

  return {
    items: pageRows.map((row) => ({
      ...toReceipt(row),
      sessionPubkey: row.session_pubkey,
    })),
    nextCursor: hasMore && last ? { createdAt: last.cursor_ts, id: last.id } : null,
  };
}

/**
 * total   : setiap percobaan yang tercatat (Actions Built).
 * blocked : percobaan yang dihentikan mandate (Transactions Protected).
 */
export async function getReceiptStats(): Promise<{
  total: number;
  blocked: number;
}> {
  const rows = await query<{ total: string; blocked: string }>(
    `SELECT count(*)::text AS total,
            count(*) FILTER (WHERE status = 'REJECTED_BY_POLICY')::text AS blocked
       FROM mandate_receipts`,
  );

  const row = requireRow(rows);
  return { total: Number(row.total), blocked: Number(row.blocked) };
}