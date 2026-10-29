/**
 * Membuat keypair agent. Secret key disimpan di .keys/agent.json (gitignored)
 * dan TIDAK dicetak. Yang dicetak hanya public key, untuk ditempel owner
 * saat membuat mandate.
 *
 * Jalankan:  pnpm agent:keygen
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Keypair } from "@solana/web3.js";

const dir = path.join(process.cwd(), ".keys");
const file = path.join(dir, "agent.json");

if (existsSync(file)) {
  console.error(`${file} already exists. Delete it first to generate a new key.`);
  process.exitCode = 1;
} else {
  mkdirSync(dir, { recursive: true });
  const agent = Keypair.generate();
  writeFileSync(file, JSON.stringify(Array.from(agent.secretKey)), { mode: 0o600 });
  console.log("Agent public key (tempel ini di form mandate):");
  console.log(agent.publicKey.toBase58());
  console.log("\nFund it with Devnet SOL for transaction fees, e.g. https://faucet.solana.com");
}