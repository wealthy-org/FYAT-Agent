mod common;

use {
    anchor_lang::prelude::Pubkey,
    anchor_lang::error::ErrorCode,
    common::*,
    fyat_mandate::{errors::FyatError, state::Vault},
    solana_signer::Signer,
};

/// Fixture dengan vault yang sudah dibuat, dan owner memegang 100 token.
fn setup() -> (Fixture, Pubkey) {
    let mut f = Fixture::new();

    let owner = f.owner.pubkey();
    let owner_token_account = f.create_token_account(&owner);
    f.mint_tokens(&owner_token_account, 100 * UNIT);

    let ix = f.ix_initialize_vault();
    send(&mut f.svm, &f.owner, &[ix], &[]).expect("initialize vault");

    (f, owner_token_account)
}

#[test]
fn initialize_vault_creates_state_and_token_account() {
    let (f, _) = setup();
    let (vault_address, bump) = f.vault();

    let account = f.svm.get_account(&vault_address).expect("vault exists");
    assert_eq!(account.owner, f.program_id, "vault must be owned by the program");

    let vault: Vault = f.read_account(&vault_address);
    assert_eq!(vault.owner, f.owner.pubkey());
    assert_eq!(vault.mint, f.mint);
    assert_eq!(vault.next_mandate_id, 0);
    assert_eq!(vault.bump, bump);

    // Token account: mint benar, dan otoritasnya adalah PDA vault (bukan owner).
    let token_account = f.account_data(&f.vault_token_account());
    assert_eq!(&token_account[0..32], f.mint.as_ref());
    assert_eq!(&token_account[32..64], vault_address.as_ref());
    assert_eq!(f.token_balance(&f.vault_token_account()), 0);
}

#[test]
fn vault_cannot_be_initialized_twice() {
    let (mut f, _) = setup();

    let ix = f.ix_initialize_vault();
    let result = send(&mut f.svm, &f.owner, &[ix], &[]);

    assert!(result.is_err(), "second initialization must fail");
}

#[test]
fn deposit_moves_tokens_into_the_vault() {
    let (mut f, owner_token_account) = setup();
    let owner = f.owner.pubkey();

    let ix = f.ix_deposit(&owner, &owner_token_account, 20 * UNIT);
    send(&mut f.svm, &f.owner, &[ix], &[]).expect("deposit");

    assert_eq!(f.token_balance(&owner_token_account), 80 * UNIT);
    assert_eq!(f.token_balance(&f.vault_token_account()), 20 * UNIT);
}

#[test]
fn deposit_of_zero_is_rejected() {
    let (mut f, owner_token_account) = setup();
    let owner = f.owner.pubkey();

    let ix = f.ix_deposit(&owner, &owner_token_account, 0);
    let result = send(&mut f.svm, &f.owner, &[ix], &[]);

    assert_custom_error(result, code(FyatError::ZeroAmount));
}

#[test]
fn deposit_by_a_non_owner_is_rejected() {
    let (mut f, _) = setup();
    let stranger = f.new_wallet();
    let stranger_token_account = f.create_token_account(&stranger.pubkey());
    f.mint_tokens(&stranger_token_account, 10 * UNIT);

    let ix = f.ix_deposit(&stranger.pubkey(), &stranger_token_account, 5 * UNIT);
    let result = send(&mut f.svm, &stranger, &[ix], &[]);

    assert_custom_error(result, code(FyatError::NotVaultOwner));
    assert_eq!(f.token_balance(&f.vault_token_account()), 0);
}

#[test]
fn owner_can_withdraw_to_their_own_account() {
    let (mut f, owner_token_account) = setup();
    let owner = f.owner.pubkey();

    let deposit = f.ix_deposit(&owner, &owner_token_account, 20 * UNIT);
    send(&mut f.svm, &f.owner, &[deposit], &[]).expect("deposit");

    let withdraw = f.ix_withdraw(&owner, &owner_token_account, 5 * UNIT);
    send(&mut f.svm, &f.owner, &[withdraw], &[]).expect("withdraw");

    assert_eq!(f.token_balance(&owner_token_account), 85 * UNIT);
    assert_eq!(f.token_balance(&f.vault_token_account()), 15 * UNIT);
}

#[test]
fn withdraw_by_a_non_owner_is_rejected() {
    let (mut f, owner_token_account) = setup();
    let owner = f.owner.pubkey();

    let deposit = f.ix_deposit(&owner, &owner_token_account, 20 * UNIT);
    send(&mut f.svm, &f.owner, &[deposit], &[]).expect("deposit");

    let stranger = f.new_wallet();
    let stranger_token_account = f.create_token_account(&stranger.pubkey());

    let ix = f.ix_withdraw(&stranger.pubkey(), &stranger_token_account, 5 * UNIT);
    let result = send(&mut f.svm, &stranger, &[ix], &[]);

    assert_custom_error(result, code(FyatError::NotVaultOwner));
    assert_eq!(f.token_balance(&f.vault_token_account()), 20 * UNIT);
}

#[test]
fn owner_cannot_withdraw_to_someone_elses_account() {
    let (mut f, owner_token_account) = setup();
    let owner = f.owner.pubkey();

    let deposit = f.ix_deposit(&owner, &owner_token_account, 20 * UNIT);
    send(&mut f.svm, &f.owner, &[deposit], &[]).expect("deposit");

    let stranger = f.new_wallet();
    let stranger_token_account = f.create_token_account(&stranger.pubkey());

    // Melindungi dari frontend yang dibajak: tujuan penarikan harus akun milik owner.
    let ix = f.ix_withdraw(&owner, &stranger_token_account, 5 * UNIT);
    let result = send(&mut f.svm, &f.owner, &[ix], &[]);

    assert_custom_error(result, ErrorCode::ConstraintTokenOwner as u32);
    assert_eq!(f.token_balance(&stranger_token_account), 0);
}

#[test]
fn withdraw_of_zero_is_rejected() {
    let (mut f, owner_token_account) = setup();
    let owner = f.owner.pubkey();

    let ix = f.ix_withdraw(&owner, &owner_token_account, 0);
    let result = send(&mut f.svm, &f.owner, &[ix], &[]);

    assert_custom_error(result, code(FyatError::ZeroAmount));
}

#[test]
fn withdraw_above_the_vault_balance_fails() {
    let (mut f, owner_token_account) = setup();
    let owner = f.owner.pubkey();

    let deposit = f.ix_deposit(&owner, &owner_token_account, 20 * UNIT);
    send(&mut f.svm, &f.owner, &[deposit], &[]).expect("deposit");

    let ix = f.ix_withdraw(&owner, &owner_token_account, 21 * UNIT);
    let result = send(&mut f.svm, &f.owner, &[ix], &[]);

    // Error program SPL Token: InsufficientFunds = 1.
    assert_custom_error(result, 1);
    assert_eq!(f.token_balance(&f.vault_token_account()), 20 * UNIT);
}
