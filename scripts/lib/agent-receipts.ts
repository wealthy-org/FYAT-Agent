import { Client } from "pg";

/** Nama error program yang berarti "ditolak mandate". Selain ini tidak dicatat. */
export const POLICY_ERRORS: ReadonlySet<string> = new Set([
  "ZeroAmount",
  "NotSessionSigner",
  "UnsupportedAction",
  "MandateIsRevoked",
  "MandateExpired",
  "ExceedsPerActionLimit",
  "ExceedsTotalBudget",
  "DestinationNotAllowed",
  "PoolNotAllowed",
]);

export type AttemptOutcome =
  | { kind: "success"; onchainSpent: bigint }
  | { kind: "rejected"; reason: string };

export type RecordResult =
  "recorded" | "duplicate" | "mandate-not-registered" | "no-database";

const MAX_REASON_LENGTH = 280;

/**
 * Mencatat satu percobaan agent. Idempoten per signature. Status berasal dari
 * chain (sudah dikonfirmasi oleh pemanggil), bukan dari klien mana pun.
 */
export async function recordAgentAttempt(input: {
  mandatePda: string;
  action: "TRANSFER" | "SWAP";
  amount: bigint;
  target: string;
  signature: string;
  outcome: AttemptOutcome;
}): Promise<RecordResult> {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) return "no-database";

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
      [input.signature],
    );

    const existing = await client.query(
      "SELECT 1 FROM mandate_receipts WHERE tx_signature = $1",
      [input.signature],
    );
    if ((existing.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return "duplicate";
    }

    const found = await client.query<{ id: string }>(
      "SELECT id FROM mandates WHERE mandate_pda = $1",
      [input.mandatePda],
    );
    const mandateId = found.rows[0]?.id;
    if (!mandateId) {
      await client.query("ROLLBACK");
      return "mandate-not-registered";
    }

    if (input.outcome.kind === "success") {
      await client.query(
        `UPDATE mandates
            SET current_spent = GREATEST(current_spent, $2::numeric)
          WHERE id = $1`,
        [mandateId, input.outcome.onchainSpent.toString()],
      );
      await client.query(
        `INSERT INTO mandate_receipts
           (mandate_id, action, amount, target, tx_signature, status)
         VALUES ($1, $2, $3, $4, $5, 'SUCCESS')`,
        [
          mandateId,
          input.action,
          input.amount.toString(),
          input.target,
          input.signature,
        ],
      );
    } else {
      await client.query(
        `INSERT INTO mandate_receipts
           (mandate_id, action, amount, target, tx_signature, status, reason)
         VALUES ($1, $2, $3, $4, $5, 'REJECTED_BY_POLICY', $6)`,
        [
          mandateId,
          input.action,
          input.amount.toString(),
          input.target,
          input.signature,
          input.outcome.reason.slice(0, MAX_REASON_LENGTH),
        ],
      );
    }

    await client.query("COMMIT");
    return "recorded";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}
