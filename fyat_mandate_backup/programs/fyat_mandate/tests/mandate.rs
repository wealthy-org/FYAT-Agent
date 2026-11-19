mod common;

use {
    anchor_lang::prelude::Pubkey,
    common::*,
    fyat_mandate::{
        errors::FyatError,
        instructions::CreateMandateParams,
        state::{Action, Mandate},
    },
    solana_keypair::Keypair,
    solana_signer::Signer,
};

/// Batas per transfer 5 token, total anggaran 12 token, umur 7 hari.
const CAP: u64 = 5 * UNIT;
const BUDGET: u64 = 12 * UNIT;
const LIFETIME: i64 = 7 * DAY;

struct World {
    f: Fixture,
    agent: Keypair,
    merchant: Keypair,
    merchant_ata: Pubkey,
    agent_ata: Pubkey,
    mandate: Pubkey,
}

fn valid_params(session: Pubkey, recipient: Pubkey) -> CreateMandateParams {
    CreateMandateParams {
        session,
        recipient,
        max_per_action: CAP,
        max_total: BUDGET,
        expires_at: BASE_TIME + LIFETIME,
    }
}

/// Vault berisi 50 token, satu mandate (id 0) untuk agent -> merchant.
fn world() -> World {
    let mut f = Fixture::new();
    let owner = f.owner.pubkey();

    let owner_ata = f.create_token_account(&owner);
    f.mint_tokens(&owner_ata, 100 * UNIT);

    let ix = f.ix_initialize_vault();
    send(&mut f.svm, &f.owner, &[ix], &[]).expect("initialize vault");

    let ix = f.ix_deposit(&owner, &owner_ata, 50 * UNIT);
    send(&mut f.svm, &f.owner, &[ix], &[]).expect("deposit");

    let agent = f.new_wallet();
    let merchant = f.new_wallet();
    let merchant_ata = f.create_token_account(&merchant.pubkey());
    let agent_ata = f.create_token_account(&agent.pubkey());

    let mandate = f.next_mandate_address();
    let ix = f.ix_create_mandate(&owner, valid_params(agent.pubkey(), merchant.pubkey()));
    send(&mut f.svm, &f.owner, &[ix], &[]).expect("create mandate");

    World {
        f,
        agent,
        merchant,
        merchant_ata,
        agent_ata,
        mandate,
    }
}

impl World {
    /// Agent menandatangani transfer dari `mandate` ke `destination`.
    fn run(&mut self, mandate: Pubkey, destination: Pubkey, amount: u64) -> TxResult {
        let ix = self
            .f
            .ix_execute_transfer(&self.agent.pubkey(), &mandate, &destination, amount);
        send(&mut self.f.svm, &self.agent, &[ix], &[])
    }

    /// Transfer sah: mandate utama, ke merchant.
    fn execute(&mut self, amount: u64) -> TxResult {
        self.run(self.mandate, self.merchant_ata, amount)
    }

    fn revoke(&mut self) -> TxResult {
        let owner = self.f.owner.pubkey();
        let ix = self.f.ix_revoke_mandate(&owner, &self.mandate);
        send(&mut self.f.svm, &self.f.owner, &[ix], &[])
    }

    fn mandate_state(&self) -> Mandate {
        self.f.read_account(&self.mandate)
    }

    fn merchant_balance(&self) -> u64 {
        self.f.token_balance(&self.merchant_ata)
    }

    fn vault_balance(&self) -> u64 {
        self.f.token_balance(&self.f.vault_token_account())
    }
}

fn try_create(w: &mut World, params: CreateMandateParams) -> TxResult {
    let owner = w.f.owner.pubkey();
    let ix = w.f.ix_create_mandate(&owner, params);
    send(&mut w.f.svm, &w.f.owner, &[ix], &[])
}

/* ------------------------------ Skenario demo ------------------------------ */

#[test]
fn create_mandate_stores_the_agreed_terms() {
    let w = world();
    let m = w.mandate_state();

    assert_eq!(m.vault, w.f.vault().0);
    assert_eq!(m.id, 0);
    assert_eq!(m.session, w.agent.pubkey());
    assert_eq!(m.recipient, w.merchant.pubkey());
    assert!(m.action == Action::Transfer);
    assert_eq!(m.max_per_action, CAP);
    assert_eq!(m.max_total, BUDGET);
    assert_eq!(m.spent, 0);
    assert_eq!(m.created_at, BASE_TIME);
    assert_eq!(m.expires_at, BASE_TIME + LIFETIME);
    assert_eq!(m.revoked_at, 0);
    assert_eq!(w.f.next_mandate_id(), 1);
}

#[test]
fn demo_1_transfer_within_the_cap_succeeds() {
    let mut w = world();

    w.execute(3 * UNIT).expect("3 token is within the 5 token cap");

    assert_eq!(w.merchant_balance(), 3 * UNIT);
    assert_eq!(w.vault_balance(), 47 * UNIT);
    assert_eq!(w.mandate_state().spent, 3 * UNIT);
}

#[test]
fn demo_2_transfer_above_the_cap_is_rejected_by_the_program() {
    let mut w = world();

    let result = w.execute(10 * UNIT);

    assert_custom_error(result, code(FyatError::ExceedsPerActionLimit));
    assert_eq!(w.merchant_balance(), 0);
    assert_eq!(w.vault_balance(), 50 * UNIT);
    assert_eq!(w.mandate_state().spent, 0);
}

#[test]
fn demo_3_sending_to_the_agents_own_wallet_is_rejected() {
    let mut w = world();

    let result = w.run(w.mandate, w.agent_ata, 3 * UNIT);

    assert_custom_error(result, code(FyatError::DestinationNotAllowed));
    assert_eq!(w.f.token_balance(&w.agent_ata), 0);
    assert_eq!(w.vault_balance(), 50 * UNIT);
}

#[test]
fn demo_4_revoke_takes_effect_immediately() {
    let mut w = world();
    w.execute(UNIT).expect("works before revoke");

    w.f.set_time(BASE_TIME + 10);
    w.revoke().expect("owner revokes");

    // Transaksi berikutnya, tanpa jeda waktu lagi, langsung ditolak.
    let result = w.execute(UNIT);
    assert_custom_error(result, code(FyatError::MandateIsRevoked));

    assert_eq!(w.mandate_state().revoked_at, BASE_TIME + 10);
    assert_eq!(w.merchant_balance(), UNIT);
}

/* ------------------------------ Kasus negatif ------------------------------ */

#[test]
fn revoking_twice_is_rejected() {
    let mut w = world();
    w.revoke().expect("first revoke");

    let result = w.revoke();

    assert_custom_error(result, code(FyatError::MandateAlreadyRevoked));
}

#[test]
fn the_agent_cannot_revoke_its_own_mandate() {
    let mut w = world();

    let ix = w.f.ix_revoke_mandate(&w.agent.pubkey(), &w.mandate);
    let result = send(&mut w.f.svm, &w.agent, &[ix], &[]);

    assert_custom_error(result, code(FyatError::NotVaultOwner));
    assert_eq!(w.mandate_state().revoked_at, 0);
}

#[test]
fn total_budget_is_a_hard_ceiling() {
    let mut w = world();
    w.execute(5 * UNIT).expect("first");
    w.execute(5 * UNIT).expect("second");
    assert_eq!(w.mandate_state().spent, 10 * UNIT);

    // Sisa anggaran 2 token: 3 token ditolak, 2 token tepat habis.
    let over = w.execute(3 * UNIT);
    assert_custom_error(over, code(FyatError::ExceedsTotalBudget));
    assert_eq!(w.mandate_state().spent, 10 * UNIT);

    w.execute(2 * UNIT).expect("exactly the remaining budget");
    assert_eq!(w.mandate_state().spent, BUDGET);

    let none_left = w.execute(UNIT);
    assert_custom_error(none_left, code(FyatError::ExceedsTotalBudget));
    assert_eq!(w.merchant_balance(), BUDGET);
}

#[test]
fn mandate_expires_exactly_at_expires_at() {
    let mut w = world();
    let expires_at = BASE_TIME + LIFETIME;

    w.f.set_time(expires_at - 1);
    w.execute(UNIT).expect("still valid one second before expiry");

    w.f.set_time(expires_at);
    let result = w.execute(UNIT);

    assert_custom_error(result, code(FyatError::MandateExpired));
    assert_eq!(w.merchant_balance(), UNIT);
}

#[test]
fn only_the_session_key_can_execute() {
    let mut w = world();
    let stranger = w.f.new_wallet();

    let ix = w
        .f
        .ix_execute_transfer(&stranger.pubkey(), &w.mandate, &w.merchant_ata, UNIT);
    let result = send(&mut w.f.svm, &stranger, &[ix], &[]);
    assert_custom_error(result, code(FyatError::NotSessionSigner));

    // Kunci owner pun bukan session key.
    let owner = w.f.owner.pubkey();
    let ix = w
        .f
        .ix_execute_transfer(&owner, &w.mandate, &w.merchant_ata, UNIT);
    let result = send(&mut w.f.svm, &w.f.owner, &[ix], &[]);
    assert_custom_error(result, code(FyatError::NotSessionSigner));

    assert_eq!(w.merchant_balance(), 0);
}

#[test]
fn zero_amount_transfer_is_rejected() {
    let mut w = world();

    let result = w.execute(0);

    assert_custom_error(result, code(FyatError::ZeroAmount));
}

#[test]
fn create_mandate_by_a_non_owner_is_rejected() {
    let mut w = world();
    let stranger = w.f.new_wallet();

    let params = valid_params(w.agent.pubkey(), w.merchant.pubkey());
    let ix = w.f.ix_create_mandate(&stranger.pubkey(), params);
    let result = send(&mut w.f.svm, &stranger, &[ix], &[]);

    assert_custom_error(result, code(FyatError::NotVaultOwner));
    assert_eq!(w.f.next_mandate_id(), 1);
}

#[test]
fn expiry_of_exactly_30_days_is_accepted() {
    let mut w = world();
    let mut p = valid_params(w.agent.pubkey(), w.merchant.pubkey());
    p.expires_at = BASE_TIME + 30 * DAY;

    try_create(&mut w, p).expect("30 days is the upper bound, inclusive");

    assert_eq!(w.f.next_mandate_id(), 2);
}

#[test]
fn mandates_are_numbered_and_independent() {
    let mut w = world();
    let first = w.mandate;
    let second = w.f.next_mandate_address();
    assert_ne!(first, second);

    let params = valid_params(w.agent.pubkey(), w.merchant.pubkey());
    try_create(&mut w, params).expect("second mandate");
    assert_eq!(w.f.next_mandate_id(), 2);

    w.revoke().expect("revoke the first");

    let revoked = w.run(first, w.merchant_ata, UNIT);
    assert_custom_error(revoked, code(FyatError::MandateIsRevoked));

    w.run(second, w.merchant_ata, UNIT)
        .expect("the second mandate is unaffected");
    assert_eq!(w.merchant_balance(), UNIT);
}

/* ------------------------- Parameter tidak valid --------------------------- */

/// Membuat mandate dari parameter valid yang diubah `edit`, lalu memastikan
/// program menolak dengan `error` dan penghitung vault tidak maju.
fn assert_create_rejected(edit: impl FnOnce(&mut CreateMandateParams, &World), error: FyatError) {
    let mut w = world();
    let mut p = valid_params(w.agent.pubkey(), w.merchant.pubkey());
    edit(&mut p, &w);

    let result = try_create(&mut w, p);

    assert_custom_error(result, code(error));
    assert_eq!(w.f.next_mandate_id(), 1, "rejected mandate must not advance the counter");
}

#[test]
fn zero_per_action_cap_is_rejected() {
    assert_create_rejected(|p, _| p.max_per_action = 0, FyatError::InvalidLimits);
}

#[test]
fn cap_above_total_budget_is_rejected() {
    assert_create_rejected(|p, _| p.max_per_action = p.max_total + 1, FyatError::InvalidLimits);
}

#[test]
fn expiry_not_in_the_future_is_rejected() {
    assert_create_rejected(|p, _| p.expires_at = BASE_TIME, FyatError::InvalidExpiry);
}

#[test]
fn expiry_beyond_30_days_is_rejected() {
    assert_create_rejected(
        |p, _| p.expires_at = BASE_TIME + 30 * DAY + 1,
        FyatError::InvalidExpiry,
    );
}

#[test]
fn session_key_equal_to_owner_is_rejected() {
    assert_create_rejected(
        |p, w| p.session = w.f.owner.pubkey(),
        FyatError::SessionIsOwner,
    );
}

#[test]
fn recipient_equal_to_session_is_rejected() {
    assert_create_rejected(|p, _| p.recipient = p.session, FyatError::RecipientIsSession);
}

#[test]
fn recipient_equal_to_vault_is_rejected() {
    assert_create_rejected(|p, w| p.recipient = w.f.vault().0, FyatError::RecipientIsVault);
}
