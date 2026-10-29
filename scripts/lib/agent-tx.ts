import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  Connection,
  Keypair,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";

export type Outcome = { signature: string; err: unknown; logs: string[] };

export function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

/**
 * Secret key agent: dari env AGENT_SECRET_KEY (JSON array, untuk server)
 * atau file .keys/agent.json (untuk lokal). Tidak pernah dicetak.
 */
export function loadAgentKeypair(): Keypair {
  const fromEnv = process.env.AGENT_SECRET_KEY;
  if (fromEnv) {
    return Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(fromEnv) as number[]),
    );
  }
  const file = path.join(process.cwd(), ".keys", "agent.json");
  if (!existsSync(file)) {
    throw new Error("Belum ada kunci agent. Jalankan `pnpm agent:keygen`.");
  }
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(file, "utf8")) as number[]),
  );
}

/** Nama error Anchor dari log, atau null kalau tidak ada. */
export function errorNameFromLogs(logs: string[]): string | null {
  for (const line of logs) {
    const match = /Error Code: (\w+)/.exec(line);
    if (match) return match[1];
  }
  return null;
}

/**
 * Agent menandatangani dan membayar fee sendiri. skipPreflight: true supaya
 * transaksi yang ditolak program TETAP tercatat di chain.
 */
export async function sendAsAgent(
  connection: Connection,
  agent: Keypair,
  instruction: TransactionInstruction,
): Promise<Outcome> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const tx = new Transaction().add(instruction);
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.feePayer = agent.publicKey;
  tx.recentBlockhash = latest.blockhash;
  tx.sign(agent);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
  });

  let err: Outcome["err"] = null;
  let confirmed = false;
  for (let i = 0; i < 60 && !confirmed; i++) {
    await sleep(1000);
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value[0];
    if (
      status &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      err = status.err;
      confirmed = true;
    }
  }
  if (!confirmed) {
    throw new Error(
      `Transaksi ${signature} belum terkonfirmasi setelah 60 detik`,
    );
  }

  let logs: string[] = [];
  for (let i = 0; i < 10 && logs.length === 0; i++) {
    const t = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    logs = t?.meta?.logMessages ?? [];
    if (logs.length === 0) await sleep(1000);
  }
  return { signature, err, logs };
}
