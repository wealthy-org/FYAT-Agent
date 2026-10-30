import bs58 from "bs58";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local`);
  return value;
}

function parseTreasuryKey(value: string): Uint8Array {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.trim());
  } catch {
    parsed = value.trim();
  }

  if (
    Array.isArray(parsed) &&
    parsed.length === 64 &&
    parsed.every(
      (byte: unknown) =>
        typeof byte === "number" &&
        Number.isInteger(byte) &&
        byte >= 0 &&
        byte <= 255,
    )
  ) {
    return Uint8Array.from(parsed);
  }
  if (typeof parsed === "string") {
    const decoded = bs58.decode(parsed);
    if (decoded.length === 64) return decoded;
  }

  throw new Error(
    "FAUCET_TREASURY_SECRET_KEY must be a 64-byte JSON array or Base58 secret key.",
  );
}

async function main(): Promise<void> {
  const treasury = Keypair.fromSecretKey(
    parseTreasuryKey(requireEnv("FAUCET_TREASURY_SECRET_KEY")),
  );
  const mint = new PublicKey(requireEnv("NEXT_PUBLIC_TOKEN_MINT"));
  const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  if ((await connection.getGenesisHash()) !== DEVNET_GENESIS_HASH) {
    throw new Error("Configured RPC endpoint is not Solana Devnet.");
  }

  const configuredPublicKey = process.env.FAUCET_PUBLIC_KEY?.trim();
  const publicKeyMatches =
    !configuredPublicKey ||
    configuredPublicKey === treasury.publicKey.toBase58();
  const treasuryAta = getAssociatedTokenAddressSync(
    mint,
    treasury.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const tokenAccount = await connection.getAccountInfo(
    treasuryAta,
    "confirmed",
  );
  const solBalance = await connection.getBalance(
    treasury.publicKey,
    "confirmed",
  );
  const dripUnits = BigInt(process.env.FAUCET_TOKEN_DRIP_UNITS ?? "50000000");

  console.log(
    `Treasury address (from secret): ${treasury.publicKey.toBase58()}`,
  );
  console.log(
    `FAUCET_PUBLIC_KEY matches: ${configuredPublicKey ? publicKeyMatches : "not set"}`,
  );
  console.log(`Token mint: ${mint.toBase58()}`);
  console.log(`Treasury SOL balance: ${solBalance / 1_000_000_000} SOL`);
  console.log(
    `Required token balance: ${Number(dripUnits) / 1_000_000} tokens`,
  );

  if (!tokenAccount) {
    console.log("Treasury token balance: no associated token account");
    console.error(
      "The treasury has no token account for this mint. Top up this treasury address using the configured mint.",
    );
    process.exitCode = 1;
    return;
  }

  const [mintInfo, tokenInfo] = await Promise.all([
    getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID),
    getAccount(connection, treasuryAta, "confirmed", TOKEN_PROGRAM_ID),
  ]);
  const balance = tokenInfo.amount;
  console.log(`Mint decimals: ${mintInfo.decimals}`);
  console.log(`Treasury token account: ${treasuryAta.toBase58()}`);
  console.log(
    `Treasury token balance: ${Number(balance) / 10 ** mintInfo.decimals}`,
  );

  if (mintInfo.decimals !== 6) {
    throw new Error("The configured token mint must use 6 decimals.");
  }
  if (balance < dripUnits) {
    console.error(
      "The treasury balance is below the per-claim amount. Top up this exact treasury address, or lower FAUCET_TOKEN_DRIP_UNITS in the deployed environment.",
    );
    process.exitCode = 1;
  } else {
    console.log("Treasury token balance is sufficient for one claim.");
  }
  if (!publicKeyMatches) {
    console.error(
      "FAUCET_PUBLIC_KEY does not match the public address derived from FAUCET_TREASURY_SECRET_KEY. The API uses the address derived from the secret.",
    );
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
