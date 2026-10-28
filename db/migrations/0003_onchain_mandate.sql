-- db/migrations/0003_onchain_mandate.sql
-- Program onchain jadi sumber kebenaran; kolom ini menautkan baris DB ke chain.
-- Nullable supaya baris lama (sebelum integrasi onchain) tidak rusak.

ALTER TABLE mandates
  ADD COLUMN mandate_pda      solana_address,
  ADD COLUMN onchain_id       u64_amount,
  ADD COLUMN create_signature solana_signature,
  ADD COLUMN revoke_signature solana_signature;

ALTER TABLE mandates
  ADD CONSTRAINT mandates_onchain_columns_together
    CHECK (
      (mandate_pda IS NULL AND create_signature IS NULL AND onchain_id IS NULL)
      OR
      (mandate_pda IS NOT NULL AND create_signature IS NOT NULL AND onchain_id IS NOT NULL)
    ),
  ADD CONSTRAINT mandates_revoke_signature_needs_revoked_at
    CHECK (revoke_signature IS NULL OR revoked_at IS NOT NULL);

-- onchain_id hanya unik per vault (id mulai dari nextMandateId tiap vault).
CREATE UNIQUE INDEX mandates_vault_onchain_id_key
  ON mandates (vault_id, onchain_id) WHERE onchain_id IS NOT NULL;
CREATE UNIQUE INDEX mandates_mandate_pda_key
  ON mandates (mandate_pda) WHERE mandate_pda IS NOT NULL;
CREATE UNIQUE INDEX mandates_create_signature_key
  ON mandates (create_signature) WHERE create_signature IS NOT NULL;
CREATE UNIQUE INDEX mandates_revoke_signature_key
  ON mandates (revoke_signature) WHERE revoke_signature IS NOT NULL;


CREATE OR REPLACE FUNCTION guard_mandate_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.vault_id IS DISTINCT FROM OLD.vault_id
     OR NEW.session_pubkey IS DISTINCT FROM OLD.session_pubkey
     OR NEW.allowed_action IS DISTINCT FROM OLD.allowed_action
     OR NEW.allowed_target IS DISTINCT FROM OLD.allowed_target
     OR NEW.max_amount_per_action IS DISTINCT FROM OLD.max_amount_per_action
     OR NEW.max_total_budget IS DISTINCT FROM OLD.max_total_budget
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'mandate terms are immutable; create a new mandate instead';
  END IF;

  IF (OLD.mandate_pda IS NOT NULL AND NEW.mandate_pda IS DISTINCT FROM OLD.mandate_pda)
     OR (OLD.onchain_id IS NOT NULL AND NEW.onchain_id IS DISTINCT FROM OLD.onchain_id)
     OR (OLD.create_signature IS NOT NULL AND NEW.create_signature IS DISTINCT FROM OLD.create_signature)
     OR (OLD.revoke_signature IS NOT NULL AND NEW.revoke_signature IS DISTINCT FROM OLD.revoke_signature) THEN
    RAISE EXCEPTION 'onchain references are immutable once set';
  END IF;

  IF NEW.current_spent < OLD.current_spent THEN
    RAISE EXCEPTION 'current_spent can only increase';
  END IF;

  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'a revoked mandate cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

