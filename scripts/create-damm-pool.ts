/**
 * Membuat pool DAMM v2 di Devnet: mint USDC tes <-> mint pasangan baru.
 * Jalankan:  pnpm pool:devnet
 * Setiap run membuat mint pasangan dan pool BARU.
 */
import * as anchor from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  getBaseFeeParams,
} from "@meteora-ag/cp-amm-sdk";

import { loadPayer } from "./lib/dev-payer";

const { BN } = anchor;

const DECIMALS = 6;
const LIQUIDITY_PER_SIDE = 500n * 1_000_000n; // 500 token per sisi

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local`);
  return value;
}

async function main(): Promise<void> {
  if ((process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") !== "devnet") {
    throw new Error("Devnet only.");
  }

  const payer = await loadPayer();
  if (!payer) throw new Error("No dev keypair. Run `pnpm mint:setup` first.");

  const usdcMint = new PublicKey(requireEnv("NEXT_PUBLIC_TOKEN_MINT"));
  const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  console.log("RPC:", new URL(rpcUrl).host);
  const connection = new Connection(rpcUrl, "confirmed");

  const sol = (await connection.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL;
  console.log(`Payer ${payer.publicKey.toBase58()}  SOL ${sol}`);
  if (sol < 0.15) throw new Error("Payer needs at least ~0.15 devnet SOL.");

  // 1. Mint pasangan baru + saldo untuk likuiditas. Dev payer adalah mint authority kedua mint.
  const pairMint = await createMint(connection, payer, payer.publicKey, null, DECIMALS);
  const usdcAta = await getOrCreateAssociatedTokenAccount(connection, payer, usdcMint, payer.publicKey);
  const pairAta = await getOrCreateAssociatedTokenAccount(connection, payer, pairMint, payer.publicKey);
  await mintTo(connection, payer, pairMint, pairAta.address, payer, LIQUIDITY_PER_SIDE);
  if (usdcAta.amount < LIQUIDITY_PER_SIDE) {
    await mintTo(connection, payer, usdcMint, usdcAta.address, payer, LIQUIDITY_PER_SIDE - usdcAta.amount);
  }
  console.log("Pair mint:", pairMint.toBase58());

  // 2. Parameter pool: rentang harga penuh, rasio 1:1, fee 1% menurun ke 0,25%.
  const cpAmm = new CpAmm(connection);
  const tokenAAmount = new BN(LIQUIDITY_PER_SIDE.toString());
  const tokenBAmount = new BN(LIQUIDITY_PER_SIDE.toString());

  const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
    tokenAAmount,
    tokenBAmount,
    minSqrtPrice: MIN_SQRT_PRICE,
    maxSqrtPrice: MAX_SQRT_PRICE,
    collectFeeMode: CollectFeeMode.BothToken,
  });

  const baseFee = getBaseFeeParams({
    baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
    feeTimeSchedulerParam: {
      startingFeeBps: 100,
      endingFeeBps: 25,
      numberOfPeriod: 10,
      totalDuration: 60,
    },
  });

  const positionNft = Keypair.generate();
  const { tx, pool } = await cpAmm.createCustomPool({
    payer: payer.publicKey,
    creator: payer.publicKey,
    positionNft: positionNft.publicKey,
    tokenAMint: usdcMint,
    tokenBMint: pairMint,
    tokenAAmount,
    tokenBAmount,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    initSqrtPrice,
    liquidityDelta,
    poolFees: { baseFee, compoundingFeeBps: 0, padding: 0, dynamicFee: null },
    hasAlphaVault: false,
    collectFeeMode: CollectFeeMode.BothToken,
    activationPoint: null,
    activationType: ActivationType.Timestamp,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  });
    // SDK versi baru bisa sudah menambahkan instruksi compute budget. Duplikat ditolak jaringan.
  const hasComputeBudget = tx.instructions.some((ix) =>
    ix.programId.equals(ComputeBudgetProgram.programId),
  );
  if (!hasComputeBudget) {
    tx.instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }));
  }

  const signature = await sendAndConfirmTransaction(connection, tx, [payer, positionNft], {
    commitment: "confirmed",
  });
  console.log(`create_pool  https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  // 3. Baca balik dari chain.
  const state = await cpAmm.fetchPoolState(pool);
  console.log("\nPool        :", pool.toBase58());
  console.log("Token A     :", state.tokenAMint.toBase58());
  console.log("Token B     :", state.tokenBMint.toBase58());
  console.log("Vault A / B :", state.tokenAVault.toBase58(), "/", state.tokenBVault.toBase58());

  console.log("\nAdd these to .env.local:");
  console.log(`DAMM_POOL=${pool.toBase58()}`);
  console.log(`SWAP_OUTPUT_MINT=${pairMint.toBase58()}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});