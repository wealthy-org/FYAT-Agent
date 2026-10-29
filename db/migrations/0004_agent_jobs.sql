CREATE TABLE agent_jobs (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id      UUID             NOT NULL REFERENCES mandates (id) ON DELETE RESTRICT,
  request_id      UUID             NOT NULL,
  amount          u64_amount       NOT NULL CHECK (amount > 0),
  status          TEXT             NOT NULL DEFAULT 'QUEUED'
                  CHECK (status IN ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'UNKNOWN')),
  job_token_hash  TEXT             NOT NULL CHECK (length(job_token_hash) = 64),
  tx_signature    solana_signature,
  error           TEXT             CHECK (length(error) <= 280),
  attempts        INTEGER          NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  locked_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,

  CONSTRAINT agent_jobs_request_unique UNIQUE (mandate_id, request_id),
  CONSTRAINT agent_jobs_status_times CHECK (
    (status = 'PROCESSING' AND locked_at IS NOT NULL AND finished_at IS NULL)
    OR
    (status IN ('QUEUED', 'SUCCEEDED', 'FAILED', 'UNKNOWN'))
  )
);

CREATE UNIQUE INDEX agent_jobs_tx_signature_key
  ON agent_jobs (tx_signature) WHERE tx_signature IS NOT NULL;
CREATE INDEX agent_jobs_queue_idx
  ON agent_jobs (created_at, id) WHERE status = 'QUEUED';
CREATE INDEX agent_jobs_mandate_created_idx
  ON agent_jobs (mandate_id, created_at DESC, id DESC);
