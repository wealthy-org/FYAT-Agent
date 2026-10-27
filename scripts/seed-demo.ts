import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transferChecked,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { Client } from "pg";

import { findVaultPda } from "../src/lib/vault-address";
import { loadPayer } from "./lib/dev-payer";

const DECIMALS = 6;
const UNIT = 10n ** BigInt(DECIMALS);
const MIN_SOL = 0.01 * LAMPORTS_PER_SOL;

const TRANSFER_AMOUNT = 3n * UNIT;
const OVER_CAP_AMOUNT = 10n * UNIT;
const MAX_PER_ACTION = 5n * UNIT;
const MAX_TOTAL = 50n * UNIT;
const TOP_UP_AMOUNT = 100n * UNIT;

const ALLOWED_NETWORKS = ["devnet", "localnet"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local`);
  return value;
}

async function main(): Promise<void> {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  if (process.env.NODE_ENV === "production" || !ALLOWED_NETWORKS.includes(network)) {
    throw new Error("Demo seeding runs on devnet/localnet in development only.");
  }

  const payer = await loadPayer();
  if (!payer) throw new Error("No dev keypair found. Run `pnpm mint:setup` first.");

  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed",
  );

  if ((await connection.getBalance(payer.publicKey)) < MIN_SOL) {
    throw new Error(
      `Dev payer ${payer.publicKey.toBase58()} needs devnet SOL. Run \`pnpm mint:setup\` or use https://faucet.solana.com`,
    );
  }

  const mint = new PublicKey(requireEnv("NEXT_PUBLIC_TOKEN_MINT"));
  const programId = requireEnv("FYAT_PROGRAM_ID");
  const dbUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("Set DATABASE_URL in .env.local");

  // --- Onchain: transfer Devnet sungguhan yang ditandatangani "agent" ------
  const payerAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
  );
  if (payerAta.amount < TRANSFER_AMOUNT) {
    await mintTo(connection, payer, mint, payerAta.address, payer, TOP_UP_AMOUNT);
  }

  const recipient = Keypair.generate().publicKey;
  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient,
  );

  const signature = await transferChecked(
    connection,
    payer,
    payerAta.address,
    mint,
    recipientAta.address,
    payer,
    TRANSFER_AMOUNT,
    DECIMALS,
  );
  console.log(`Devnet transfer confirmed: ${signature}`);

  // --- Database -----------------------------------------------------------
  const owner = Keypair.generate().publicKey.toBase58(); // pemilik demo, tanpa kunci yang dipegang siapa pun
  const vaultPda = findVaultPda({ owner, mint: mint.toBase58(), programId });

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    const vault = await client.query<{ id: string }>(
      `INSERT INTO vaults (owner_pubkey, vault_pda, token_mint)
       VALUES ($1, $2, $3)
       ON CONFLICT (vault_pda) DO UPDATE SET owner_pubkey = EXCLUDED.owner_pubkey
       RETURNING id`,
      [owner, vaultPda, mint.toBase58()],
    );

    const mandate = await client.query<{ id: string }>(
      `INSERT INTO mandates
         (vault_id, session_pubkey, allowed_action, allowed_target,
          max_amount_per_action, max_total_budget, current_spent, expires_at)
       VALUES ($1, $2, 'TRANSFER', $3, $4, $5, $6, now() + interval '7 days')
       RETURNING id`,
      [
        vault.rows[0]?.id,
        payer.publicKey.toBase58(),
        recipient.toBase58(),
        MAX_PER_ACTION.toString(),
        MAX_TOTAL.toString(),
        TRANSFER_AMOUNT.toString(),
      ],
    );
    const mandateId = mandate.rows[0]?.id;

    // clock_timestamp() agar urutan waktu ketiga baris berbeda dan natural.
    const insertReceipt = (
      amount: bigint,
      target: string,
      status: string,
      reason: string,
      txSignature: string | null,
    ) =>
      client.query(
        `INSERT INTO mandate_receipts
           (mandate_id, action, amount, target, tx_signature, status, reason, created_at)
         VALUES ($1, 'TRANSFER', $2, $3, $4, $5, $6, clock_timestamp())`,
        [mandateId, amount.toString(), target, txSignature, status, reason],
      );

    await insertReceipt(
      TRANSFER_AMOUNT,
      recipient.toBase58(),
      "SUCCESS",
      "Demo: plain devnet transfer signed by the agent key (onchain mandate arrives in Step 12)",
      signature,
    );
    await insertReceipt(
      OVER_CAP_AMOUNT,
      recipient.toBase58(),
      "REJECTED_BY_POLICY",
      "Per-action cap: 10 USDC vs cap 5 USDC",
      null,
    );
    await insertReceipt(
      TRANSFER_AMOUNT,
      payer.publicKey.toBase58(),
      "REJECTED_BY_POLICY",
      "Approved recipient: the agent's own wallet is not in the mandate",
      null,
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }

  console.log("Seeded 3 receipts (1 PASS, 2 BLOCKED).");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});