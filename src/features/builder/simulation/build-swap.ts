import { BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getMint,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  PublicKey,
  type Connection,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  CpAmm,
  getCurrentPoint,
  swapQuoteExactInput,
} from "@meteora-ag/cp-amm-sdk";

import { getSwapConfig, type SwapConfig } from "@/lib/swap-config";
import {
  DAMM_PROGRAM_ID,
  deriveEventAuthority,
  derivePoolAuthority,
  deriveVaultTokenAccount,
} from "@/lib/meteora";
import type { FyatMandate } from "@/lib/idl/fyat_mandate.types";
import type { Program } from "@coral-xyz/anchor";

const SLIPPAGE_TOLERANCE = 0.01;
const COMPUTE_UNIT_LIMIT = 400_000;

export async function fetchConfiguredSwapPool(
  connection: Connection,
  config: SwapConfig | null = getSwapConfig(),
) {
  if (!config) {
    throw new Error(
      "Swap is not configured. Set the input mint, Meteora DAMM pool, and output mint.",
    );
  }

  const inputMint = new PublicKey(config.inputMint);
  const outputMint = new PublicKey(config.outputMint);
  const pool = new PublicKey(config.pool);
  const poolState = await new CpAmm(connection).fetchPoolState(pool);
  const inputIsTokenA = poolState.tokenAMint.equals(inputMint);
  const poolContainsConfiguredPair =
    (inputIsTokenA && poolState.tokenBMint.equals(outputMint)) ||
    (poolState.tokenBMint.equals(inputMint) &&
      poolState.tokenAMint.equals(outputMint));
  if (!poolContainsConfiguredPair) {
    throw new Error(
      "The configured Meteora pool does not contain the input and output mints.",
    );
  }

  return { config, poolState, inputIsTokenA };
}

export async function buildExecuteSwapInstructions(args: {
  connection: Connection;
  program: Program<FyatMandate>;
  payer: PublicKey;
  session: PublicKey;
  mandatePda: string;
  amountIn: bigint;
}): Promise<{
  instructions: TransactionInstruction[];
  minimumAmountOut: bigint;
}> {
  const { connection, program, payer, session, mandatePda, amountIn } = args;
  const config = getSwapConfig();

  if (!config) {
    throw new Error(
      "Swap is not configured. Set the input mint, Meteora DAMM pool, and output mint.",
    );
  }
  if (amountIn <= 0n) {
    throw new Error("The swap amount must be greater than zero.");
  }

  const inputMint = new PublicKey(config.inputMint);
  const outputMint = new PublicKey(config.outputMint);
  const pool = new PublicKey(config.pool);
  const { poolState, inputIsTokenA } = await fetchConfiguredSwapPool(
    connection,
    config,
  );

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
    new BN(amountIn.toString()),
    SLIPPAGE_TOLERANCE,
    inputIsTokenA,
    false,
    tokenADecimals.decimals,
    tokenBDecimals.decimals,
  );
  if (!quote.minimumAmountOut || quote.minimumAmountOut.lten(0)) {
    throw new Error("Meteora could not provide a valid minimum output quote.");
  }

  const mandate = await program.account.mandate.fetch(
    new PublicKey(mandatePda),
  );
  if (!("swap" in mandate.action)) {
    throw new Error("The active mandate does not authorize swaps.");
  }
  if (!mandate.recipient.equals(pool)) {
    throw new Error("The configured pool does not match the active mandate.");
  }
  const vault = mandate.vault;
  const vaultOutputTokenAccount = deriveVaultTokenAccount(
    vault.toBase58(),
    outputMint.toBase58(),
  );
  const vaultInputTokenAccount = deriveVaultTokenAccount(
    vault.toBase58(),
    inputMint.toBase58(),
  );

  const createOutputAccount =
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      vaultOutputTokenAccount,
      vault,
      outputMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
  const swapInstruction = await program.methods
    .executeSwap(
      new BN(amountIn.toString()),
      quote.minimumAmountOut,
    )
    .accountsPartial({
      session,
      vault,
      mandate: new PublicKey(mandatePda),
      mint: inputMint,
      vaultTokenAccount: vaultInputTokenAccount,
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

  return {
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: COMPUTE_UNIT_LIMIT,
      }),
      createOutputAccount,
      swapInstruction,
    ],
    minimumAmountOut: BigInt(quote.minimumAmountOut.toString()),
  };
}
