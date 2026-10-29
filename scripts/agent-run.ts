/**
 * Agent runner: agent menandatangani execute_transfer dengan session key-nya
 * sendiri. Owner tidak terlibat. Semua penolakan datang dari program onchain.
 *
 * Jalankan:
 *   pnpm agent:run --mandate <PDA> --amount 3
 *   pnpm agent:run --mandate <PDA> --amount 3 --to <wallet lain>   (uji penolakan)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { findVaultPda } from "../src/lib/vault-address";
import {
  errorNameFromLogs,
  explorerTx,
  loadAgentKeypair,
  sendAsAgent,
} from "./lib/agent-tx";
import {
  POLICY_ERRORS,
  recordAgentAttempt,
  type RecordResult,
} from "./lib/agent-receipts";

const { BN } = anchor;
const DECIMALS = 6;

function toBaseUnits(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value.trim());
  if (!match) throw new Error(`Jumlah tidak valid: "${value}"`);
  const whole = BigInt(match[1]) * 10n ** BigInt(DECIMALS);
  const fraction = BigInt((match[2] ?? "").padEnd(DECIMALS, "0"));
  const total = whole + fraction;
  if (total <= 0n) throw new Error("Jumlah harus lebih besar dari nol.");
  return total;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local`);
  return value;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      mandate: { type: "string" },
      amount: { type: "string" },
      to: { type: "string" },
      "no-record": { type: "boolean" },
    },
  });
  if (!values.mandate || !values.amount) {
    throw new Error("Pakai: --mandate <PDA> --amount <jumlah> [--to <wallet>]");
  }

  if ((process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") !== "devnet") {
    throw new Error("Devnet only.");
  }

  const agent = loadAgentKeypair();
  const programId = new PublicKey(requireEnv("FYAT_PROGRAM_ID"));
  const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const idl = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "src", "lib", "idl", "fyat_mandate.json"),
      "utf8",
    ),
  ) as anchor.Idl;
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(agent),
    {
      commitment: "confirmed",
    },
  );
  const program = new anchor.Program(idl, provider);
  // IDL dimuat dari JSON, jadi tipenya longgar.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = program.account as any;

  const mandate = new PublicKey(values.mandate);
  const mandateState = await accounts.mandate.fetch(mandate);
  const vaultState = await accounts.vault.fetch(mandateState.vault);

  if (!mandateState.session.equals(agent.publicKey)) {
    throw new Error(
      `Kunci agent ${agent.publicKey.toBase58()} bukan session key mandate ini ` +
        `(${mandateState.session.toBase58()}).`,
    );
  }

  const vault = new PublicKey(
    findVaultPda({
      owner: vaultState.owner.toBase58(),
      mint: vaultState.mint.toBase58(),
      programId: programId.toBase58(),
    }),
  );
  const mint: PublicKey = vaultState.mint;
  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, vault, true);

  const destinationOwner = values.to
    ? new PublicKey(values.to)
    : (mandateState.recipient as PublicKey);
  const destinationTokenAccount = getAssociatedTokenAddressSync(
    mint,
    destinationOwner,
  );

  const amount = toBaseUnits(values.amount);
  const sol = (await connection.getBalance(agent.publicKey)) / LAMPORTS_PER_SOL;

  console.log(`Agent      : ${agent.publicKey.toBase58()} (${sol} SOL)`);
  console.log(`Mandate    : ${mandate.toBase58()}`);
  console.log(
    `Tujuan     : ${destinationOwner.toBase58()}${values.to ? "  (DIUBAH oleh --to)" : ""}`,
  );
  console.log(`Jumlah     : ${values.amount} (${amount} base unit)\n`);

  if (sol < 0.002) {
    throw new Error(
      "Saldo SOL agent terlalu kecil untuk fee. Isi dari faucet Devnet.",
    );
  }
  if (!(await connection.getAccountInfo(destinationTokenAccount))) {
    throw new Error(
      "Token account tujuan belum ada, jadi tidak ada yang bisa diuji.",
    );
  }

  const instruction = await methods
    .executeTransfer(new BN(amount.toString()))
    .accountsPartial({
      session: agent.publicKey,
      vault,
      mandate,
      mint,
      vaultTokenAccount,
      destinationTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const outcome = await sendAsAgent(connection, agent, instruction);

  if (outcome.err === null) {
    console.log("HASIL: BERHASIL");
  } else {
    const raw = JSON.stringify(outcome.err);
    const name =
      errorNameFromLogs(outcome.logs) ??
      (raw.includes('"Custom":1}')
        ? "SPL Token InsufficientFunds: saldo vault kurang, bukan penolakan mandate"
        : raw);
    console.log(`HASIL: DITOLAK PROGRAM (${name})`);
  }
  console.log(explorerTx(outcome.signature));
  if (values["no-record"]) {
    console.log("Receipt  : dilewati (--no-record).");
  } else {
    const errorName = errorNameFromLogs(outcome.logs);
    const base = {
      mandatePda: mandate.toBase58(),
      amount,
      target: destinationOwner.toBase58(),
      signature: outcome.signature,
    };

    let result: RecordResult | null = null;
    if (outcome.err === null) {
      const after = await accounts.mandate.fetch(mandate);
      result = await recordAgentAttempt({
        ...base,
        outcome: {
          kind: "success",
          onchainSpent: BigInt(after.spent.toString()),
        },
      });
    } else if (errorName && POLICY_ERRORS.has(errorName)) {
      result = await recordAgentAttempt({
        ...base,
        outcome: {
          kind: "rejected",
          reason: `Rejected by the mandate program: ${errorName}`,
        },
      });
    }
    console.log(
      `Receipt  : ${result ?? "tidak dicatat (bukan penolakan kebijakan)"}`,
    );
  }
  void ASSOCIATED_TOKEN_PROGRAM_ID;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
