/**
 * Agent runner: agent menandatangani transfer atau swap dengan session key-nya
 * sendiri. Owner tidak terlibat. Semua penolakan datang dari program onchain.
 *
 * Jalankan:
 *   pnpm agent:run --mandate <PDA> --amount 3
 *   pnpm agent:run --mandate <PDA> --amount 3 --to <wallet lain>   (uji transfer ditolak)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import * as anchor from "@coral-xyz/anchor";
import { CpAmm, getCurrentPoint, swapQuoteExactInput } from "@meteora-ag/cp-amm-sdk";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type TransactionInstruction,
} from "@solana/web3.js";

import { getSwapConfig } from "../src/lib/swap-config";
import {
  DAMM_PROGRAM_ID,
  deriveEventAuthority,
  derivePoolAuthority,
  deriveVaultTokenAccount,
} from "../src/lib/meteora";
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
  if (!match) throw new Error(`Invalid amount: "${value}"`);
  const whole = BigInt(match[1]) * 10n ** BigInt(DECIMALS);
  const fraction = BigInt((match[2] ?? "").padEnd(DECIMALS, "0"));
  const total = whole + fraction;
  if (total <= 0n) throw new Error("The amount must be greater than zero.");
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
    throw new Error("Usage: --mandate <PDA> --amount <amount> [--to <wallet>]");
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
      `Agent key ${agent.publicKey.toBase58()} is not the session key for this mandate ` +
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

  const action = "swap" in mandateState.action ? "SWAP" : "TRANSFER";
  if (action === "SWAP" && values.to) {
    throw new Error("The --to option is only available for transfer mandates.");
  }
  const amount = toBaseUnits(values.amount);
  const sol = (await connection.getBalance(agent.publicKey)) / LAMPORTS_PER_SOL;
  let target: PublicKey;
  let instruction: TransactionInstruction | TransactionInstruction[];

  console.log(`Agent      : ${agent.publicKey.toBase58()} (${sol} SOL)`);
  console.log(`Mandate    : ${mandate.toBase58()}`);
  console.log(`Action     : ${action}`);
  console.log(`Amount     : ${values.amount} (${amount} base units)\n`);

  if (sol < 0.002) {
    throw new Error(
      "The agent does not have enough SOL for transaction fees. Fund it from the Devnet faucet.",
    );
  }
  if (action === "TRANSFER") {
    const destinationOwner = values.to
      ? new PublicKey(values.to)
      : (mandateState.recipient as PublicKey);
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      mint,
      destinationOwner,
    );
    if (!(await connection.getAccountInfo(destinationTokenAccount))) {
      throw new Error(
        "The destination token account does not exist, so there is nothing to test.",
      );
    }

    target = destinationOwner;
    console.log(
      `Destination: ${destinationOwner.toBase58()}${values.to ? "  (OVERRIDDEN by --to)" : ""}`,
    );
    instruction = await methods
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
  } else {
    const config = getSwapConfig();
    if (!config || config.inputMint !== mint.toBase58()) {
      throw new Error(
        "Swap is not configured for this vault. Check the DAMM pool and swap mints.",
      );
    }
    const pool = new PublicKey(config.pool);
    const outputMint = new PublicKey(config.outputMint);
    if (!(mandateState.recipient as PublicKey).equals(pool)) {
      throw new Error("The configured DAMM pool does not match the mandate.");
    }

    const poolState = await new CpAmm(connection).fetchPoolState(pool);
    const aToB = poolState.tokenAMint.equals(mint);
    const poolMatchesMints =
      (aToB && poolState.tokenBMint.equals(outputMint)) ||
      (poolState.tokenBMint.equals(mint) &&
        poolState.tokenAMint.equals(outputMint));
    if (!poolMatchesMints) {
      throw new Error(
        "The configured DAMM pool does not contain the input and output mints.",
      );
    }
    const [tokenADecimals, tokenBDecimals] = await Promise.all([
      getMint(connection, poolState.tokenAMint, "confirmed", TOKEN_PROGRAM_ID),
      getMint(connection, poolState.tokenBMint, "confirmed", TOKEN_PROGRAM_ID),
    ]);
    const currentPoint = await getCurrentPoint(
      connection,
      poolState.activationType,
    );
    const quote = swapQuoteExactInput(
      poolState,
      currentPoint,
      new BN(amount.toString()),
      0.01,
      aToB,
      false,
      tokenADecimals.decimals,
      tokenBDecimals.decimals,
    );
    if (!quote.minimumAmountOut || quote.minimumAmountOut.lten(0)) {
      throw new Error("Meteora could not provide a valid minimum output quote.");
    }

    const vaultOutputTokenAccount = deriveVaultTokenAccount(
      vault.toBase58(),
      outputMint.toBase58(),
    );
    const createOutputAccount =
      createAssociatedTokenAccountIdempotentInstruction(
        agent.publicKey,
        vaultOutputTokenAccount,
        vault,
        outputMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
    const swapInstruction = await methods
      .executeSwap(
        new BN(amount.toString()),
        quote.minimumAmountOut,
      )
      .accountsPartial({
        session: agent.publicKey,
        vault,
        mandate,
        mint,
        vaultTokenAccount,
        outputMint,
        vaultOutputTokenAccount,
        pool,
        poolAuthority: derivePoolAuthority(),
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        eventAuthority: deriveEventAuthority(),
        ammProgram: new PublicKey(DAMM_PROGRAM_ID),
      })
      .instruction();
    target = pool;
    instruction = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      createOutputAccount,
      swapInstruction,
    ];
    console.log(`Pool       : ${pool.toBase58()}`);
    console.log(`Output mint: ${outputMint.toBase58()}`);
    console.log(
      `Minimum output: ${quote.minimumAmountOut.toString()} base units`,
    );
  }

  const outcome = await sendAsAgent(connection, agent, instruction);

  if (outcome.err === null) {
    console.log("RESULT: SUCCESS");
  } else {
    const raw = JSON.stringify(outcome.err);
    const name =
      errorNameFromLogs(outcome.logs) ??
      (raw.includes('"Custom":1}')
        ? "SPL Token InsufficientFunds: vault balance is too low, not a mandate rejection"
        : raw);
    console.log(`RESULT: REJECTED BY PROGRAM (${name})`);
  }
  console.log(explorerTx(outcome.signature));
  if (values["no-record"]) {
    console.log("Receipt  : skipped (--no-record).");
  } else {
    const errorName = errorNameFromLogs(outcome.logs);
    const base = {
      mandatePda: mandate.toBase58(),
      action,
      amount,
      target: target.toBase58(),
      signature: outcome.signature,
    };

    let result: RecordResult | null = null;
    if (outcome.err === null) {
      const after = await accounts.mandate.fetch(mandate);
      result = await recordAgentAttempt({
        ...base,
        action,
        outcome: {
          kind: "success",
          onchainSpent: BigInt(after.spent.toString()),
        },
      });
    } else if (errorName && POLICY_ERRORS.has(errorName)) {
      result = await recordAgentAttempt({
        ...base,
        action,
        outcome: {
          kind: "rejected",
          reason: `Rejected by the mandate program: ${errorName}`,
        },
      });
    }
    console.log(
      `Receipt  : ${result ?? "not recorded (not a policy rejection)"}`,
    );
  }
  void ASSOCIATED_TOKEN_PROGRAM_ID;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
