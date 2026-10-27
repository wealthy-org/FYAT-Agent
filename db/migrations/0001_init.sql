/* ------------------------------ Domain types ------------------------------ */

-- Public key Solana: Base58, 32 byte → 32-44 karakter.
CREATE DOMAIN solana_address AS TEXT
  CHECK (VALUE ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$');

-- Signature transaksi: Base58, 64 byte → 86-88 karakter.
CREATE DOMAIN solana_signature AS TEXT
  CHECK (VALUE ~ '^[1-9A-HJ-NP-Za-km-z]{86,88}$');

-- Jumlah token dalam base unit, setara tipe u64 di program Solana.
CREATE DOMAIN u64_amount AS NUMERIC(20, 0)
  CHECK (VALUE >= 0 AND VALUE <= 18446744073709551615);

/* --------------------------------- Vaults --------------------------------- */

CREATE TABLE vaults (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_pubkey  solana_address NOT NULL,
  vault_pda     solana_address NOT NULL UNIQUE,
  token_mint    solana_address NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX vaults_owner_pubkey_idx ON vaults (owner_pubkey);

/* -------------------------------- Mandates -------------------------------- */

CREATE TABLE mandates (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id               UUID           NOT NULL REFERENCES vaults (id) ON DELETE RESTRICT,
  session_pubkey         solana_address NOT NULL,
  allowed_action         TEXT           NOT NULL CHECK (allowed_action IN ('SWAP', 'TRANSFER')),
  -- SWAP: kode venue (mis. METEORA_DAMM). TRANSFER: alamat recipient.
  allowed_target         TEXT           NOT NULL CHECK (length(allowed_target) BETWEEN 1 AND 64),
  max_amount_per_action  u64_amount     NOT NULL CHECK (max_amount_per_action > 0),
  max_total_budget       u64_amount     NOT NULL CHECK (max_total_budget > 0),
  current_spent          u64_amount     NOT NULL DEFAULT 0,
  expires_at             TIMESTAMPTZ    NOT NULL,
  revoked_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT mandates_cap_within_budget
    CHECK (max_amount_per_action <= max_total_budget),
  CONSTRAINT mandates_spent_within_budget
    CHECK (current_spent <= max_total_budget),
  CONSTRAINT mandates_expiry_after_creation
    CHECK (expires_at > created_at)
);

CREATE INDEX mandates_vault_id_idx ON mandates (vault_id);
CREATE INDEX mandates_session_pubkey_idx ON mandates (session_pubkey);

/* ---------------------------- Mandate receipts ---------------------------- */

CREATE TABLE mandate_receipts (
  id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id    UUID             NOT NULL REFERENCES mandates (id) ON DELETE RESTRICT,
  -- Aksi yang DICOBA agent. Bisa berbeda dari aksi mandate (itulah yang ditolak).
  action        TEXT             NOT NULL CHECK (action IN ('SWAP', 'TRANSFER')),
  amount        u64_amount       NOT NULL CHECK (amount > 0),
  target        TEXT             NOT NULL CHECK (length(target) BETWEEN 1 AND 64),
  tx_signature  solana_signature,
  status        TEXT             NOT NULL
                CHECK (status IN ('SUCCESS', 'REJECTED_BY_POLICY', 'FAILED_SIMULATION')),
  reason        TEXT             CHECK (length(reason) <= 280),
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),

  CONSTRAINT receipts_success_has_signature
    CHECK (status <> 'SUCCESS' OR tx_signature IS NOT NULL)
);

CREATE UNIQUE INDEX mandate_receipts_tx_signature_key
  ON mandate_receipts (tx_signature) WHERE tx_signature IS NOT NULL;
CREATE INDEX mandate_receipts_created_at_idx
  ON mandate_receipts (created_at DESC, id DESC);
CREATE INDEX mandate_receipts_mandate_idx
  ON mandate_receipts (mandate_id, created_at DESC);

/* -------------------------- Integrity triggers --------------------------- */

-- Audit tape: receipt hanya boleh ditambah, tidak boleh diubah atau dihapus.
CREATE FUNCTION forbid_receipt_modification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'mandate_receipts is append-only';
END;
$$;

CREATE TRIGGER mandate_receipts_append_only
  BEFORE UPDATE OR DELETE ON mandate_receipts
  FOR EACH ROW EXECUTE FUNCTION forbid_receipt_modification();

-- Syarat mandate tidak boleh diubah setelah dibuat. Hanya `current_spent`
-- (naik terus) dan `revoked_at` (sekali set, permanen) yang boleh berubah.
CREATE FUNCTION guard_mandate_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id                    IS DISTINCT FROM OLD.id
     OR NEW.vault_id              IS DISTINCT FROM OLD.vault_id
     OR NEW.session_pubkey        IS DISTINCT FROM OLD.session_pubkey
     OR NEW.allowed_action        IS DISTINCT FROM OLD.allowed_action
     OR NEW.allowed_target        IS DISTINCT FROM OLD.allowed_target
     OR NEW.max_amount_per_action IS DISTINCT FROM OLD.max_amount_per_action
     OR NEW.max_total_budget      IS DISTINCT FROM OLD.max_total_budget
     OR NEW.expires_at            IS DISTINCT FROM OLD.expires_at
     OR NEW.created_at            IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'mandate terms are immutable; create a new mandate instead';
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

CREATE TRIGGER mandates_guard_update
  BEFORE UPDATE ON mandates
  FOR EACH ROW EXECUTE FUNCTION guard_mandate_update();