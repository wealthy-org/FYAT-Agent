import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Keypair } from "@solana/web3.js";

const KEY_DIR = path.join(process.cwd(), ".keys");
const KEY_PATH = path.join(KEY_DIR, "dev-payer.json");

/** null bila keypair dev belum dibuat. */
export async function loadPayer(): Promise<Keypair | null> {
  if (!existsSync(KEY_PATH)) return null;

  const secret = JSON.parse(await readFile(KEY_PATH, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export async function loadOrCreatePayer(): Promise<Keypair> {
  const existing = await loadPayer();
  if (existing) return existing;

  const payer = Keypair.generate();
  await mkdir(KEY_DIR, { recursive: true });
  await writeFile(KEY_PATH, JSON.stringify(Array.from(payer.secretKey)), {
    mode: 0o600,
  });
  console.log(`Created dev keypair at ${KEY_PATH} (gitignored, devnet only)`);
  return payer;
}
