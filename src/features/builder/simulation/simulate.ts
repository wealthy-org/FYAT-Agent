import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type Connection,
} from "@solana/web3.js";

import { withTimeout } from "@/lib/async";
import { env } from "@/lib/env";
import { getSwapConfig } from "@/lib/swap-config";

import { USDC_DECIMALS } from "../constants";
import { evaluatePolicy } from "../policy";
import {
  buildTransferTransaction,
  deriveTransferAccounts,
} from "./build-transfer";
import { buildExecuteSwapInstructions } from "./build-swap";
import { classifyFailure } from "./classify";
import type { SimulationOutcome, SimulationRequest } from "./types";
const RPC_TIMEOUT_MS = 15_000;
const MAX_LOG_LINES = 12;
const MAX_LOG_LENGTH = 200;

/** Log berasal dari luar aplikasi: dibatasi ukurannya, dan hanya dirender sebagai teks. */
function cleanLogs(logs: readonly string[] | null | undefined): string[] {
  return (logs ?? [])
    .slice(-MAX_LOG_LINES)
    .map((line) => line.slice(0, MAX_LOG_LENGTH));
}

export async function runSimulation(
  connection: Connection,
  request: SimulationRequest,
): Promise<SimulationOutcome> {
  const { config, attempt, payer } = request;

  // Pertahanan berlapis: tombol di UI sudah menyaring, tapi fungsi ini tidak mempercayainya.
  if (!evaluatePolicy(config, attempt).allowed) {
    return {
      kind: "UNSUPPORTED",
      message: "Attempts blocked by the mandate are never simulated.",
    };
  }

  if (config.action === "SWAP") {
    if (
      !request.program ||
      !request.sessionPubkey ||
      !request.activeMandate ||
      request.activeMandate.action !== "SWAP" ||
      request.activeMandate.recipient !== getSwapConfig()?.pool ||
      request.activeMandate.maxPerAction !== config.maxPerAction ||
      request.activeMandate.maxTotal !== config.maxTotal
    ) {
      return {
        kind: "UNSUPPORTED",
        message:
          "Create or restore a swap mandate before running the on-chain swap simulation.",
      };
    }

    try {
      const { instructions } = await buildExecuteSwapInstructions({
        connection,
        program: request.program,
        payer,
        session: request.sessionPubkey,
        mandatePda: request.activeMandate.mandatePda,
        amountIn: attempt.amount,
      });
      const transaction = new VersionedTransaction(
        new TransactionMessage({
          payerKey: payer,
          recentBlockhash: PublicKey.default.toBase58(),
          instructions,
        }).compileToV0Message(),
      );
      const { value } = await withTimeout(
        connection.simulateTransaction(transaction, {
          sigVerify: false,
          replaceRecentBlockhash: true,
          commitment: "confirmed",
        }),
        RPC_TIMEOUT_MS,
        "Swap simulation",
      );
      const logs = cleanLogs(value.logs);

      if (value.err) {
        return { kind: "FAILED", ...classifyFailure(value.err, logs), logs };
      }

      return {
        kind: "PASSED",
        unitsConsumed: value.unitsConsumed ?? null,
        logs,
      };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[swap simulation]", error);
      }
      return {
        kind: "ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Could not simulate the swap. Check the pool configuration and RPC connection.",
      };
    }
  }

  if (!env.NEXT_PUBLIC_TOKEN_MINT) {
    return {
      kind: "UNSUPPORTED",
      message:
        "Set NEXT_PUBLIC_TOKEN_MINT to enable simulation (run pnpm mint:setup).",
    };
  }

  try {
    const mint = new PublicKey(env.NEXT_PUBLIC_TOKEN_MINT);
    const recipient = new PublicKey(config.recipient);
    const { sourceAta } = deriveTransferAccounts(mint, payer, recipient);

    // Satu panggilan untuk dua pre-check.
    const [mintInfo, sourceInfo] = await withTimeout(
      connection.getMultipleAccountsInfo([mint, sourceAta], "confirmed"),
      RPC_TIMEOUT_MS,
      "Account lookup",
    );

    if (!mintInfo || !mintInfo.owner.equals(TOKEN_PROGRAM_ID)) {
      return {
        kind: "FAILED",
        code: "MINT_NOT_FOUND",
        message:
          "The configured token mint was not found on this network. Run pnpm mint:setup and update NEXT_PUBLIC_TOKEN_MINT.",
        logs: [],
      };
    }

    if (!sourceInfo) {
      return {
        kind: "FAILED",
        code: "NO_TOKEN_ACCOUNT",
        message:
          "Your wallet has no token account for this mint yet. Run pnpm mint:setup --to <your wallet> to receive test tokens.",
        logs: [],
      };
    }

    const transaction = buildTransferTransaction({
      payer,
      mint,
      recipient,
      amount: attempt.amount,
      decimals: USDC_DECIMALS,
    });

    const { value } = await withTimeout(
      connection.simulateTransaction(transaction, {
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: "confirmed",
      }),
      RPC_TIMEOUT_MS,
      "Simulation",
    );

    const logs = cleanLogs(value.logs);

    if (value.err) {
      return { kind: "FAILED", ...classifyFailure(value.err, logs), logs };
    }

    return {
      kind: "PASSED",
      unitsConsumed: value.unitsConsumed ?? null,
      logs,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[simulation]", error);
    }
    return {
      kind: "ERROR",
      message:
        "Could not reach the Solana RPC. Check your connection and try again.",
    };
  }
}