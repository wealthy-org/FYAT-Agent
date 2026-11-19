//! Harness bersama untuk test LiteSVM.
//! Instruksi SPL dibangun dari byte mentah supaya test tidak bergantung pada versi crate SPL.
#![allow(dead_code)]

use {
    anchor_lang::{
        prelude::{Clock, Pubkey},
        solana_program::{
            instruction::{AccountMeta, Instruction},
            system_program,
        },
        AccountDeserialize, Id, InstructionData, ToAccountMetas,
    },
    anchor_spl::{associated_token::AssociatedToken, token::Token},
    fyat_mandate::constants::{MANDATE_SEED, VAULT_SEED},
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const PROGRAM_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_TARGET_TMPDIR"),
    "/../deploy/fyat_mandate.so"
));

pub const DECIMALS: u8 = 6;
/// 1 token dalam base unit.
pub const UNIT: u64 = 1_000_000;
/// Jam awal test. Default LiteSVM adalah 0, yang tidak realistis untuk uji kedaluwarsa.
pub const BASE_TIME: i64 = 1_800_000_000;
pub const DAY: i64 = 86_400;

const MINT_SPACE: usize = 82;

pub type TxResult = Result<(), String>;

/* --------------------------- Pengiriman transaksi --------------------------- */

pub fn send(
    svm: &mut LiteSVM,
    payer: &Keypair,
    instructions: &[Instruction],
    extra_signers: &[&Keypair],
) -> TxResult {
    // Transaksi identik ditolak LiteSVM (AlreadyProcessed), jadi selalu pakai blockhash baru.
    svm.expire_blockhash();
    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(instructions, Some(&payer.pubkey()), &blockhash);

    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend_from_slice(extra_signers);

    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(message), signers.as_slice())
        .expect("transaction should sign");

    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|failed| format!("{:?}\n{}", failed.err, failed.meta.logs.join("\n")))
}

/// Memastikan transaksi gagal dengan error kustom `code`.
pub fn assert_custom_error(result: TxResult, code: u32) {
    let error = result.expect_err("transaction should have failed");
    let needle = format!("Custom({code})");
    assert!(
        error.contains(&needle),
        "expected {needle}, got:\n{error}"
    );
}

/// Kode error program: 6000 + urutan varian.
pub fn code(error: fyat_mandate::errors::FyatError) -> u32 {
    u32::from(error)
}

/* ------------------------------- Alamat PDA -------------------------------- */

pub fn vault_pda(owner: &Pubkey, mint: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[VAULT_SEED, owner.as_ref(), mint.as_ref()], program_id)
}

pub fn mandate_pda(vault: &Pubkey, id: u64, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[MANDATE_SEED, vault.as_ref(), &id.to_le_bytes()],
        program_id,
    )
}

pub fn ata(wallet: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[wallet.as_ref(), Token::id().as_ref(), mint.as_ref()],
        &AssociatedToken::id(),
    )
    .0
}

/* ---------------------- Instruksi dari byte mentah ------------------------- */

fn create_account_ix(
    payer: &Pubkey,
    new_account: &Pubkey,
    lamports: u64,
    space: u64,
    owner: &Pubkey,
) -> Instruction {
    let mut data = Vec::with_capacity(52);
    data.extend_from_slice(&0u32.to_le_bytes()); // System: CreateAccount
    data.extend_from_slice(&lamports.to_le_bytes());
    data.extend_from_slice(&space.to_le_bytes());
    data.extend_from_slice(owner.as_ref());

    Instruction::new_with_bytes(
        system_program::ID,
        &data,
        vec![
            AccountMeta::new(*payer, true),
            AccountMeta::new(*new_account, true),
        ],
    )
}

fn initialize_mint_ix(mint: &Pubkey, authority: &Pubkey, decimals: u8) -> Instruction {
    let mut data = vec![20u8, decimals]; // Token: InitializeMint2
    data.extend_from_slice(authority.as_ref());
    data.push(0); // tanpa freeze authority

    Instruction::new_with_bytes(Token::id(), &data, vec![AccountMeta::new(*mint, false)])
}

fn create_ata_ix(payer: &Pubkey, ata_address: &Pubkey, wallet: &Pubkey, mint: &Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        AssociatedToken::id(),
        &[1u8], // ATA: CreateIdempotent
        vec![
            AccountMeta::new(*payer, true),
            AccountMeta::new(*ata_address, false),
            AccountMeta::new_readonly(*wallet, false),
            AccountMeta::new_readonly(*mint, false),
            AccountMeta::new_readonly(system_program::ID, false),
            AccountMeta::new_readonly(Token::id(), false),
        ],
    )
}

fn mint_to_ix(mint: &Pubkey, destination: &Pubkey, authority: &Pubkey, amount: u64) -> Instruction {
    let mut data = vec![7u8]; // Token: MintTo
    data.extend_from_slice(&amount.to_le_bytes());

    Instruction::new_with_bytes(
        Token::id(),
        &data,
        vec![
            AccountMeta::new(*mint, false),
            AccountMeta::new(*destination, false),
            AccountMeta::new_readonly(*authority, true),
        ],
    )
}

/* -------------------------------- Fixture ---------------------------------- */

pub struct Fixture {
    pub svm: LiteSVM,
    pub program_id: Pubkey,
    /// Pemilik vault. Juga pembayar biaya untuk persiapan test.
    pub owner: Keypair,
    pub mint: Pubkey,
    pub mint_authority: Keypair,
}

impl Fixture {
    pub fn new() -> Self {
        let program_id = fyat_mandate::id();
        let mut svm = LiteSVM::new();
        svm.add_program(program_id, PROGRAM_BYTES)
            .expect("program should load");

        let mut clock = svm.get_sysvar::<Clock>();
        clock.unix_timestamp = BASE_TIME;
        svm.set_sysvar::<Clock>(&clock);

        let owner = Keypair::new();
        svm.airdrop(&owner.pubkey(), 10_000_000_000).unwrap();

        let mint = Keypair::new();
        let mint_authority = Keypair::new();

        let rent = svm.minimum_balance_for_rent_exemption(MINT_SPACE);
        let create = create_account_ix(
            &owner.pubkey(),
            &mint.pubkey(),
            rent,
            MINT_SPACE as u64,
            &Token::id(),
        );
        let init = initialize_mint_ix(&mint.pubkey(), &mint_authority.pubkey(), DECIMALS);
        send(&mut svm, &owner, &[create, init], &[&mint]).expect("create mint");

        Self {
            svm,
            program_id,
            owner,
            mint: mint.pubkey(),
            mint_authority,
        }
    }

    /* ------------------------------ Persiapan ------------------------------ */

    /// Wallet baru dengan sedikit SOL untuk biaya transaksi.
    pub fn new_wallet(&mut self) -> Keypair {
        let wallet = Keypair::new();
        self.svm.airdrop(&wallet.pubkey(), 1_000_000_000).unwrap();
        wallet
    }

    /// Membuat token account (ATA) milik `wallet`, dibayar oleh owner fixture.
    pub fn create_token_account(&mut self, wallet: &Pubkey) -> Pubkey {
        let address = ata(wallet, &self.mint);
        let ix = create_ata_ix(&self.owner.pubkey(), &address, wallet, &self.mint);
        send(&mut self.svm, &self.owner, &[ix], &[]).expect("create token account");
        address
    }

    pub fn mint_tokens(&mut self, to: &Pubkey, amount: u64) {
        let ix = mint_to_ix(&self.mint, to, &self.mint_authority.pubkey(), amount);
        send(&mut self.svm, &self.owner, &[ix], &[&self.mint_authority]).expect("mint tokens");
    }

    pub fn set_time(&mut self, unix_timestamp: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp = unix_timestamp;
        self.svm.set_sysvar::<Clock>(&clock);
    }

    /* -------------------------------- Pembacaan ---------------------------- */

    pub fn vault(&self) -> (Pubkey, u8) {
        vault_pda(&self.owner.pubkey(), &self.mint, &self.program_id)
    }

    pub fn vault_token_account(&self) -> Pubkey {
        ata(&self.vault().0, &self.mint)
    }

    pub fn account_data(&self, address: &Pubkey) -> Vec<u8> {
        self.svm
            .get_account(address)
            .expect("account should exist")
            .data
    }

    pub fn token_balance(&self, token_account: &Pubkey) -> u64 {
        let data = self.account_data(token_account);
        u64::from_le_bytes(data[64..72].try_into().expect("token account amount"))
    }

    pub fn read_account<T: AccountDeserialize>(&self, address: &Pubkey) -> T {
        let data = self.account_data(address);
        T::try_deserialize(&mut data.as_slice()).expect("account should deserialize")
    }

    /* ---------------------------- Builder instruksi ------------------------ */

    pub fn ix_initialize_vault(&self) -> Instruction {
        let (vault, _) = self.vault();

        Instruction::new_with_bytes(
            self.program_id,
            &fyat_mandate::instruction::InitializeVault {}.data(),
            fyat_mandate::accounts::InitializeVault {
                owner: self.owner.pubkey(),
                mint: self.mint,
                vault,
                vault_token_account: self.vault_token_account(),
                token_program: Token::id(),
                associated_token_program: AssociatedToken::id(),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    pub fn ix_deposit(&self, signer: &Pubkey, from: &Pubkey, amount: u64) -> Instruction {
        Instruction::new_with_bytes(
            self.program_id,
            &fyat_mandate::instruction::Deposit { amount }.data(),
            fyat_mandate::accounts::Deposit {
                owner: *signer,
                vault: self.vault().0,
                mint: self.mint,
                owner_token_account: *from,
                vault_token_account: self.vault_token_account(),
                token_program: Token::id(),
            }
            .to_account_metas(None),
        )
    }

    pub fn ix_withdraw(&self, signer: &Pubkey, to: &Pubkey, amount: u64) -> Instruction {
        Instruction::new_with_bytes(
            self.program_id,
            &fyat_mandate::instruction::Withdraw { amount }.data(),
            fyat_mandate::accounts::Withdraw {
                owner: *signer,
                vault: self.vault().0,
                mint: self.mint,
                vault_token_account: self.vault_token_account(),
                owner_token_account: *to,
                token_program: Token::id(),
            }
            .to_account_metas(None),
        )
    }
}

impl Fixture {
    pub fn next_mandate_id(&self) -> u64 {
        let vault: fyat_mandate::state::Vault = self.read_account(&self.vault().0);
        vault.next_mandate_id
    }

    /// Alamat mandate berikutnya yang akan dibuat (dari penghitung di vault).
    pub fn next_mandate_address(&self) -> Pubkey {
        mandate_pda(&self.vault().0, self.next_mandate_id(), &self.program_id).0
    }

    pub fn ix_create_mandate(
        &self,
        signer: &Pubkey,
        params: fyat_mandate::instructions::CreateMandateParams,
    ) -> Instruction {
        Instruction::new_with_bytes(
            self.program_id,
            &fyat_mandate::instruction::CreateMandate { params }.data(),
            fyat_mandate::accounts::CreateMandate {
                owner: *signer,
                vault: self.vault().0,
                mandate: self.next_mandate_address(),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    pub fn ix_revoke_mandate(&self, signer: &Pubkey, mandate: &Pubkey) -> Instruction {
        Instruction::new_with_bytes(
            self.program_id,
            &fyat_mandate::instruction::RevokeMandate {}.data(),
            fyat_mandate::accounts::RevokeMandate {
                owner: *signer,
                vault: self.vault().0,
                mandate: *mandate,
            }
            .to_account_metas(None),
        )
    }

    pub fn ix_execute_transfer(
        &self,
        session: &Pubkey,
        mandate: &Pubkey,
        destination_token_account: &Pubkey,
        amount: u64,
    ) -> Instruction {
        Instruction::new_with_bytes(
            self.program_id,
            &fyat_mandate::instruction::ExecuteTransfer { amount }.data(),
            fyat_mandate::accounts::ExecuteTransfer {
                session: *session,
                vault: self.vault().0,
                mandate: *mandate,
                mint: self.mint,
                vault_token_account: self.vault_token_account(),
                destination_token_account: *destination_token_account,
                token_program: Token::id(),
            }
            .to_account_metas(None),
        )
    }
}
