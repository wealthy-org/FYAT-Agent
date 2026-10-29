import "server-only";

import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

import idlJson from "@/lib/idl/fyat_mandate.json";

import { OnchainReadError } from "./mandate-reader";

const coder = new BorshAccountsCoder(idlJson as Idl);

export type OnchainVault = {
  pda: string;
  owner: string;
  mint: string;
};

/**
 * Membaca akun Vault dari chain. Akun harus dimiliki program, berdiskriminator
 * Vault, dan owner/mint di dalamnya harus sama dengan yang diharapkan.
 */
export async function readVault(
  connection: Connection,
  args: {
    vaultPda: string;
    programId: string;
    expectedOwner: string;
    expectedMint: string;
  },
): Promise<OnchainVault> {
  const info = await connection.getAccountInfo(
    new PublicKey(args.vaultPda),
    "confirmed",
  );
  if (!info) {
    throw new OnchainReadError(
      "Vault account not found on chain. Run initialize_vault first.",
    );
  }
  if (!info.owner.equals(new PublicKey(args.programId))) {
    throw new OnchainReadError("Account is not owned by the mandate program");
  }

  let decoded: Record<string, unknown>;
  try {
    decoded = coder.decode("Vault", info.data) as Record<string, unknown>;
  } catch {
    throw new OnchainReadError("Account is not a Vault");
  }

  const owner = (decoded.owner as PublicKey).toBase58();
  const mint = (decoded.mint as PublicKey).toBase58();
  if (owner !== args.expectedOwner) {
    throw new OnchainReadError("Vault owner does not match this wallet");
  }
  if (mint !== args.expectedMint) {
    throw new OnchainReadError("Vault mint does not match the app token mint");
  }

    return { pda: args.vaultPda, owner, mint };
}