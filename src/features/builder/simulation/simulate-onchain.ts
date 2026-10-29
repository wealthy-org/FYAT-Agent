import { BN, type Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type Connection,
} from "@solana/web3.js";

import { FYAT_PROGRAM_ID } from "@/lib/program-id";
import idlJson from "@/lib/idl/fyat_mandate.json";
import type { FyatMandate } from "@/lib/idl/fyat_mandate.types";
import { findVaultPda } from "@/lib/vault-address";

import type { ActiveMandate } from "../mandate-creator-types";

export type OnchainProbeResult = {
  /** true = program akan menerima transaksi ini. */
  accepted: boolean;
  /** Nama error program, mis. "ExceedsPerActionLimit". Null jika diterima. */
  programError: string | null;
  logs: string[];
};

type IdlError = { code: number; name: string };
const IDL_ERRORS = (idlJson as unknown as { errors: IdlError[] }).errors;

function programErrorName(err: unknown, logs: string[]): string | null {
  const text = `${logs.join("\n")}\n${JSON.stringify(err)}`;
  for (const { code, name } of IDL_ERRORS) {
    if (
      text.includes(`Error Code: ${name}`) ||
      text.includes(`"Custom":${code}`)
    ) {
      return name;
    }
  }
  return null;
}

/**
 * Menyimulasikan `execute_transfer` LANGSUNG ke program onchain, tanpa
 * penyaring UI. Penolakan yang muncul berasal dari program, bukan frontend.
 * Tidak ada tanda tangan dan tidak ada biaya: ini hanya simulateTransaction.
 */
export async function probeExecuteTransfer(args: {
  connection: Connection;
  program: Program<FyatMandate>;
  /** Wallet owner. Hanya sebagai fee payer simulasi, tidak menandatangani. */
  feePayer: PublicKey;
  /** Public key session key agent. */
  session: PublicKey;
  mandate: ActiveMandate;
  /** Pemilik token account tujuan: recipient resmi, atau wallet agent sendiri. */
  destinationOwner: PublicKey;
  amount: bigint;
}): Promise<OnchainProbeResult> {
  const { connection, program, feePayer, session, mandate, amount } = args;

  const mint = new PublicKey(mandate.mint);
  const vault = new PublicKey(
    findVaultPda({
      owner: mandate.owner,
      mint: mandate.mint,
      programId: FYAT_PROGRAM_ID,
    }),
  );
  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, vault, true);
  const destination = getAssociatedTokenAddressSync(mint, args.destinationOwner);

  // ATA tujuan dibuat di dalam simulasi saja, supaya yang diuji murni aturan program.
  const createDestination = createAssociatedTokenAccountIdempotentInstruction(
    feePayer,
    destination,
    args.destinationOwner,
    mint,
  );

  const execute = await program.methods
    .executeTransfer(new BN(amount.toString()))
    .accountsPartial({
      session,
      vault,
      mandate: new PublicKey(mandate.mandatePda),
      mint,
      vaultTokenAccount,
      destinationTokenAccount: destination,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [createDestination, execute],
  }).compileToV0Message();

  const { value } = await connection.simulateTransaction(
    new VersionedTransaction(message),
    { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" },
  );

  const logs = (value.logs ?? []).slice(-12).map((l) => l.slice(0, 200));
  return {
    accepted: value.err === null,
    programError: value.err ? programErrorName(value.err, logs) : null,
    logs,
  };
}