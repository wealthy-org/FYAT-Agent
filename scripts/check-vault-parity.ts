import { findVaultPda } from "../src/lib/vault-address";

// Vektor yang sama dengan programs/fyat_mandate/tests/pda_parity.rs
const EXPECTED = "F2MmgCAU2Y9K7sYresqN7cVMztBCYsmfUfU5UY3wQPAn";

const actual = findVaultPda({
  owner: "Vote111111111111111111111111111111111111111",
  mint: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  programId: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
});

console.log(`web  : ${actual}`);
console.log(`ref  : ${EXPECTED}`);

if (actual !== EXPECTED) {
  console.error("MISMATCH: web and the reference vector disagree.");
  process.exitCode = 1;
} else {
  console.log("OK: web derivation matches the test vector.");
}
