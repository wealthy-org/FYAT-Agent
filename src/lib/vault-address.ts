import { PublicKey } from "@solana/web3.js";

const VAULT_SEED = new TextEncoder().encode("vault");

/**
 * Vault PDA = f(owner, mint, program). Seed ini HARUS identik dengan seed
 * program Anchor di Step 12. Hasilnya sama persis dengan versi Step 8.
 */
export function findVaultPda(params: {
  owner: string;
  mint: string;
  programId: string;
}): string {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      VAULT_SEED,
      new PublicKey(params.owner).toBytes(),
      new PublicKey(params.mint).toBytes(),
    ],
    new PublicKey(params.programId),
  );

  return pda.toBase58();
}