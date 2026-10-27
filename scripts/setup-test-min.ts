import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";

const KEY_DIR = path.join(process.cwd(), ".keys");
const KEY_PATH = path.join(KEY_DIR, "dev-payer.json");
const DECIMALS = 6;
const MINT_AMOUNT = 100n * 10n ** BigInt(DECIMALS); // 100 token
const MIN_BALANCE = 0.05 * LAMPORTS_PER_SOL;
const AIRDROP_LAMPORTS = 1 * LAMPORTS_PER_SOL;
const ALLOWED_NETWORKS = ["devnet", "localnet"];

function readRecipientArg(): PublicKey | null {
  const index = process.argv.indexOf("--to");
  if (index === -1) return null;

  const value = process.argv[index + 1];
  if (!value) throw new Error("--to needs a wallet address");
  return new PublicKey(value);
}

async function loadOrCreatePayer(): Promise<Keypair> {
  if (existsSync(KEY_PATH)) {
    const secret = JSON.parse(await readFile(KEY_PATH, "utf8")) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  }

  const payer = Keypair.generate();
  await mkdir(KEY_DIR, { recursive: true });
  await writeFile(KEY_PATH, JSON.stringify(Array.from(payer.secretKey)), {
    mode: 0o600,
  });
  console.log(`Created dev keypair at ${KEY_PATH} (gitignored, devnet only)`);
  return payer;
}

async function ensureSol(connection: Connection, payer: Keypair): Promise<void> {
  const balance = await connection.getBalance(payer.publicKey, "confirmed");
  if (balance >= MIN_BALANCE) return;

  console.log("Requesting a devnet airdrop…");
  try {
    const signature = await connection.requestAirdrop(
      payer.publicKey,
      AIRDROP_LAMPORTS,
    );
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  } catch {
    throw new Error(
      `Airdrop failed (the public faucet is rate limited).\n` +
        `Send devnet SOL to ${payer.publicKey.toBase58()} via https://faucet.solana.com and run this again.`,
    );
  }
}

/** Memakai mint di env bila sudah ada dan valid, selain itu buat yang baru. */
async function resolveMint(
  connection: Connection,
  payer: Keypair,
): Promise<PublicKey> {
  const configured = process.env.NEXT_PUBLIC_TOKEN_MINT;

  if (configured) {
    try {
      const existing = new PublicKey(configured);
      const info = await connection.getAccountInfo(existing, "confirmed");
      if (info?.owner.equals(TOKEN_PROGRAM_ID)) {
        console.log(`Using existing mint ${existing.toBase58()}`);
        return existing;
      }
    } catch {
      // Env berisi placeholder/alamat tidak valid → buat mint baru.
    }
  }

  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    null, // tanpa freeze authority
    DECIMALS,
  );
  console.log(`Created new mint ${mint.toBase58()}`);
  return mint;
}

async function main(): Promise<void> {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  if (!ALLOWED_NETWORKS.includes(network)) {
    throw new Error(`Refusing to run on "${network}". Devnet/localnet only.`);
  }

  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const recipient = readRecipientArg();
  const payer = await loadOrCreatePayer();
  console.log(`Dev payer: ${payer.publicKey.toBase58()}`);

  await ensureSol(connection, payer);
  const mint = await resolveMint(connection, payer);

  if (recipient) {
    const account = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient,
    );
    await mintTo(connection, payer, mint, account.address, payer, MINT_AMOUNT);
    console.log(`Minted 100 test tokens to ${recipient.toBase58()}`);
  }

  console.log(`\nSet this in .env.local, then restart pnpm dev:`);
  console.log(`NEXT_PUBLIC_TOKEN_MINT=${mint.toBase58()}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});