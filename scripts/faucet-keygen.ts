import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Keypair } from "@solana/web3.js";

const directory = path.join(process.cwd(), ".keys");
const file = path.join(directory, "faucet-treasury.json");

if (existsSync(file)) {
  console.error(`${file} already exists. Keep the existing treasury key.`);
  process.exitCode = 1;
} else {
  mkdirSync(directory, { recursive: true });
  const treasury = Keypair.generate();
  writeFileSync(file, JSON.stringify(Array.from(treasury.secretKey)), {
    mode: 0o600,
  });
  console.log("Faucet treasury public key:");
  console.log(treasury.publicKey.toBase58());
  console.log(
    "\nFund this dedicated Devnet wallet with SOL and test USDC. Keep its secret key out of source control.",
  );
}
