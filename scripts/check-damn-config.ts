/** Memeriksa konfigurasi DAMM di .env.local terhadap pool di Devnet. */
import assert from "node:assert/strict";

import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import { getAccount } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local`);
  return value;
}

async function main(): Promise<void> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const pool = new PublicKey(requireEnv("NEXT_PUBLIC_DAMM_POOL"));
  const usdc = requireEnv("NEXT_PUBLIC_TOKEN_MINT");
  const output = requireEnv("NEXT_PUBLIC_SWAP_OUTPUT_MINT");

  const state = await new CpAmm(connection).fetchPoolState(pool);
  const a = state.tokenAMint.toBase58();
  const b = state.tokenBMint.toBase58();

  assert.deepEqual(
    [a, b].sort(),
    [usdc, output].sort(),
    `Pool mints (${a}, ${b}) do not match NEXT_PUBLIC_TOKEN_MINT / NEXT_PUBLIC_SWAP_OUTPUT_MINT`,
  );

  const [vaultA, vaultB] = await Promise.all([
    getAccount(connection, state.tokenAVault),
    getAccount(connection, state.tokenBVault),
  ]);

  console.log(`Pool    : ${pool.toBase58()}`);
  console.log(`Token A : ${a}  reserve ${vaultA.amount}`);
  console.log(`Token B : ${b}  reserve ${vaultB.amount}`);
  assert.ok(
    vaultA.amount > 0n && vaultB.amount > 0n,
    "Pool has an empty side, so a swap will fail.",
  );
  console.log("OK: pool matches .env.local and both sides have liquidity.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});