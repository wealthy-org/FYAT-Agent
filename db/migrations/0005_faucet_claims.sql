CREATE TABLE faucet_claims (
  wallet      solana_address PRIMARY KEY,
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX faucet_claims_claimed_at_idx ON faucet_claims (claimed_at);
