-- 0002_api_security.sql: nonce anti-replay dan counter rate limit.

CREATE TABLE auth_nonces (
  nonce       TEXT           PRIMARY KEY CHECK (nonce ~ '^[0-9a-f]{32}$'),
  wallet      solana_address NOT NULL,
  expires_at  TIMESTAMPTZ    NOT NULL
);

CREATE INDEX auth_nonces_expires_at_idx ON auth_nonces (expires_at);

CREATE TABLE rate_limit_hits (
  bucket        TEXT        NOT NULL CHECK (length(bucket) <= 100),
  window_start  TIMESTAMPTZ NOT NULL,
  hits          INTEGER     NOT NULL DEFAULT 1 CHECK (hits > 0),
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX rate_limit_hits_window_idx ON rate_limit_hits (window_start);