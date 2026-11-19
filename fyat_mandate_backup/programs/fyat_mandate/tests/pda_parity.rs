use {anchor_lang::prelude::Pubkey, fyat_mandate::constants::VAULT_SEED, std::str::FromStr};

/// Vektor uji yang sama dipakai di `scripts/check-vault-parity.ts` pada aplikasi web.
/// Kalau seed atau urutan seed berubah di salah satu sisi, kedua test gagal.
const OWNER: &str = "Vote111111111111111111111111111111111111111";
const MINT: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const PROGRAM: &str = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const EXPECTED: &str = "F2MmgCAU2Y9K7sYresqN7cVMztBCYsmfUfU5UY3wQPAn";

#[test]
fn vault_pda_matches_the_web_test_vector() {
    let owner = Pubkey::from_str(OWNER).unwrap();
    let mint = Pubkey::from_str(MINT).unwrap();
    let program = Pubkey::from_str(PROGRAM).unwrap();

    let (pda, _) =
        Pubkey::find_program_address(&[VAULT_SEED, owner.as_ref(), mint.as_ref()], &program);

    assert_eq!(pda.to_string(), EXPECTED);
}
