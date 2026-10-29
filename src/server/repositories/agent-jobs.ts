import "server-only";

import { firstRow, query } from "../db/client";
import { toBigInt, toDate } from "../db/mappers";

export type AgentJobStatus =
  "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";

export type AgentJob = {
  id: string;
  mandateId: string;
  amount: bigint;
  status: AgentJobStatus;
  txSignature: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
};

type AgentJobRow = {
  id: string;
  mandate_id: string;
  amount: string;
  status: AgentJobStatus;
  tx_signature: string | null;
  error: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  finished_at: Date | string | null;
};

const COLUMNS = `
  id, mandate_id, amount, status, tx_signature, error,
  created_at, updated_at, finished_at`;
const QUALIFIED_COLUMNS = `
  j.id, j.mandate_id, j.amount, j.status, j.tx_signature, j.error,
  j.created_at, j.updated_at, j.finished_at`;

function toAgentJob(row: AgentJobRow): AgentJob {
  return {
    id: row.id,
    mandateId: row.mandate_id,
    amount: toBigInt(row.amount),
    status: row.status,
    txSignature: row.tx_signature,
    error: row.error,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    finishedAt: row.finished_at ? toDate(row.finished_at) : null,
  };
}

export async function insertAgentJob(input: {
  mandateId: string;
  requestId: string;
  amount: bigint;
  tokenHash: string;
}): Promise<{ job: AgentJob; tokenHash: string }> {
  const inserted = await query<AgentJobRow & { job_token_hash: string }>(
    `INSERT INTO agent_jobs (mandate_id, request_id, amount, job_token_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (mandate_id, request_id) DO NOTHING
     RETURNING ${COLUMNS}, job_token_hash`,
    [
      input.mandateId,
      input.requestId,
      input.amount.toString(),
      input.tokenHash,
    ],
  );
  const created = firstRow(inserted);
  if (created)
    return { job: toAgentJob(created), tokenHash: created.job_token_hash };

  const existing = await query<AgentJobRow & { job_token_hash: string }>(
    `SELECT ${COLUMNS}, job_token_hash
       FROM agent_jobs
      WHERE mandate_id = $1 AND request_id = $2`,
    [input.mandateId, input.requestId],
  );
  const row = firstRow(existing);
  if (!row) throw new Error("Agent job insert conflict could not be resolved.");
  return { job: toAgentJob(row), tokenHash: row.job_token_hash };
}

export async function findAgentJob(input: {
  id: string;
}): Promise<
  | (AgentJob & {
      mandatePda: string;
      sessionPubkey: string;
      action: "TRANSFER" | "SWAP";
      target: string;
    })
  | null
> {
  const rows = await query<
    AgentJobRow & {
      mandate_pda: string | null;
      session_pubkey: string;
      allowed_action: "TRANSFER" | "SWAP";
      allowed_target: string;
    }
  >(
    `SELECT ${QUALIFIED_COLUMNS},
            m.mandate_pda, m.session_pubkey,
            m.allowed_action, m.allowed_target
       FROM agent_jobs AS j
       JOIN mandates AS m ON m.id = j.mandate_id
      WHERE j.id = $1`,
    [input.id],
  );
  const row = firstRow(rows);
  if (!row || !row.mandate_pda) return null;

  return {
    ...toAgentJob(row),
    mandatePda: row.mandate_pda,
    sessionPubkey: row.session_pubkey,
    action: row.allowed_action,
    target: row.allowed_target,
  };
}

export async function findAgentJobByTokenHash(input: {
  id: string;
}): Promise<(AgentJob & { tokenHash: string }) | null> {
  const rows = await query<AgentJobRow & { job_token_hash: string }>(
    `SELECT ${COLUMNS}, job_token_hash
       FROM agent_jobs
      WHERE id = $1`,
    [input.id],
  );
  const row = firstRow(rows);
  return row ? { ...toAgentJob(row), tokenHash: row.job_token_hash } : null;
}

export async function finishAgentJob(input: {
  id: string;
  status: Exclude<AgentJobStatus, "QUEUED" | "PROCESSING">;
  error?: string;
}): Promise<void> {
  await query(
    `UPDATE agent_jobs
        SET status = $2, error = $3, updated_at = now(), finished_at = now()
      WHERE id = $1 AND status = 'PROCESSING'`,
    [input.id, input.status, input.error?.slice(0, 280) ?? null],
  );
}
