/**
 * End-to-end Devnet: menjalankan empat skenario demo langsung ke program
 * fyat_mandate yang sudah di-deploy. Tidak ada logika "pura-pura" di sisi web:
 * semua penolakan datang dari program onchain.
 *
 * Jalankan:  pnpm e2e:devnet
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";

import * as anchor from "@coral-xyz/anchor";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";

import { findVaultPda } from "../src/lib/vault-address";
import { loadPayer } from "./lib/dev-payer";

const { BN } = anchor;

const UNIT = 1_000_000n; // mint 6 desimal
const CAP = 5n * UNIT; // batas per transfer
const BUDGET = 12n * UNIT; // total anggaran
const VAULT_FUNDING = 20n * UNIT;
const AGENT_SOL = 0.01 * LAMPORTS_PER_SOL;
const MANDATE_LIFETIME_SECONDS = 24 * 60 * 60;

/* ------------------------------- Konfigurasi ------------------------------- */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local`);
  return value;
}

function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

type IdlError = { code: number; name: string };
type IdlJson = anchor.Idl & { errors: IdlError[] };

function loadIdl(): IdlJson {
  const file = path.join(process.cwd(), "src", "lib", "idl", "fyat_mandate.json");
  return JSON.parse(readFileSync(file, "utf8")) as IdlJson;
}

/* --------------------------------- Helper ---------------------------------- */

function mandatePda(
  vault: PublicKey,
  id: bigint,
  programId: PublicKey,
): PublicKey {
  const idBytes = new BN(id.toString()).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mandate"), vault.toBuffer(), idBytes],
    programId,
  )[0];
}

type Outcome = { signature: string; err: unknown; logs: string[] };

/**
 * Agent menandatangani dan membayar fee sendiri. skipPreflight: true supaya
 * transaksi yang ditolak program TETAP tercatat di chain (ada link Explorer).
 */
async function sendAsAgent(
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
  if (!confirmed) throw new Error(`Transaksi ${signature} belum terkonfirmasi setelah 60 detik`);

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

function assertSucceeded(label: string, outcome: Outcome): void {
  assert.equal(
    outcome.err,
    null,
    `${label}: expected success, got ${JSON.stringify(outcome.err)}\n${outcome.logs.join("\n")}`,
  );
}

function assertRejectedWith(
  label: string,
  outcome: Outcome,
  errors: IdlError[],
  name: string,
): void {
  const code = errors.find((e) => e.name === name)?.code;
  assert.ok(code !== undefined, `${name} is not in the IDL`);
  assert.notEqual(outcome.err, null, `${label}: expected ${name}, but it succeeded`);

  const text = `${outcome.logs.join("\n")}\n${JSON.stringify(outcome.err)}`;
  const matches =
    text.includes(`Error Code: ${name}`) ||
    text.includes(`"Custom":${code}`) ||
    text.includes(`custom program error: 0x${code.toString(16)}`);
  assert.ok(
    matches,
    `${label}: rejected, but not with ${name} (${code}).\n${text}`,
  );
}

/* ---------------------------------- Main ----------------------------------- */

async function main(): Promise<void> {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  if (network !== "devnet") {
    throw new Error(`Refusing to run on "${network}". Devnet only.`);
  }

  const owner = await loadPayer();
  if (!owner) throw new Error("No dev keypair. Run `pnpm mint:setup` first.");

  const mint = new PublicKey(requireEnv("NEXT_PUBLIC_TOKEN_MINT"));
  const programId = new PublicKey(requireEnv("FYAT_PROGRAM_ID"));
    const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  console.log("RPC:", new URL(rpcUrl).host);
  const connection = new Connection(rpcUrl, "confirmed");

  const idl = loadIdl();
  assert.equal(idl.address, programId.toBase58(), "IDL address != FYAT_PROGRAM_ID");

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(owner),
    { commitment: "confirmed" },
  );
  const program = new anchor.Program(idl, provider);
  // IDL dimuat dari JSON, jadi tipenya longgar.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = program.account as any;

  const solBalance = await connection.getBalance(owner.publicKey);
  console.log(`Owner (dev payer): ${owner.publicKey.toBase58()}`);
  console.log(`Program          : ${programId.toBase58()}`);
  console.log(`Mint             : ${mint.toBase58()}`);
  console.log(`Owner SOL        : ${solBalance / LAMPORTS_PER_SOL}\n`);
  if (solBalance < 0.05 * LAMPORTS_PER_SOL) {
    throw new Error("Owner needs at least ~0.05 devnet SOL (https://faucet.solana.com).");
  }

  /* ---- 1. Vault: buat bila belum ada, lalu isi ---------------------------- */
  const vault = new PublicKey(
    findVaultPda({
      owner: owner.publicKey.toBase58(),
      mint: mint.toBase58(),
      programId: programId.toBase58(),
    }),
  );
  const vaultAta = getAssociatedTokenAddressSync(mint, vault, true);

  if (!(await connection.getAccountInfo(vault))) {
    const signature: string = await methods
      .initializeVault()
      .accountsPartial({
        owner: owner.publicKey,
        mint,
        vault,
        vaultTokenAccount: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`initialize_vault  ${explorerTx(signature)}`);
  } else {
    console.log("Vault already exists, reusing it.");
  }

  const ownerAta = await getOrCreateAssociatedTokenAccount(
    connection,
    owner,
    mint,
    owner.publicKey,
  );
  const vaultBalance = (await getAccount(connection, vaultAta)).amount;
  if (vaultBalance < VAULT_FUNDING) {
    const missing = VAULT_FUNDING - vaultBalance;
    if (ownerAta.amount < missing) {
      // Dev payer adalah mint authority mint ini.
      await mintTo(connection, owner, mint, ownerAta.address, owner, missing);
    }
    const signature: string = await methods
      .deposit(new BN(missing.toString()))
      .accountsPartial({
        owner: owner.publicKey,
        vault,
        mint,
        ownerTokenAccount: ownerAta.address,
        vaultTokenAccount: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log(`deposit           ${explorerTx(signature)}`);
  }

  /* ---- 2. Aktor demo: agent dan merchant (baru di setiap run) ------------- */
  const agent = Keypair.generate();
  const merchant = Keypair.generate();

  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: owner.publicKey,
        toPubkey: agent.publicKey,
        lamports: AGENT_SOL,
      }),
    ),
    [owner],
  );
  const merchantAta = (
    await getOrCreateAssociatedTokenAccount(connection, owner, mint, merchant.publicKey)
  ).address;
  const agentAta = (
    await getOrCreateAssociatedTokenAccount(connection, owner, mint, agent.publicKey)
  ).address;

  /* ---- 3. Owner membuat mandate ------------------------------------------- */
  const vaultState = await accounts.vault.fetch(vault);
  const mandateId = BigInt(vaultState.nextMandateId.toString());
  const mandate = mandatePda(vault, mandateId, programId);

  const slot = await connection.getSlot("confirmed");
  const now = (await connection.getBlockTime(slot)) ?? Math.floor(Date.now() / 1000);

  const createSig: string = await methods
    .createMandate({
      session: agent.publicKey,
      recipient: merchant.publicKey,
      maxPerAction: new BN(CAP.toString()),
      maxTotal: new BN(BUDGET.toString()),
      expiresAt: new BN(now + MANDATE_LIFETIME_SECONDS),
    })
    .accountsPartial({
      owner: owner.publicKey,
      vault,
      mandate,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`create_mandate    ${explorerTx(createSig)}`);
  console.log(`  mandate #${mandateId}: ${mandate.toBase58()}`);
  console.log(`  agent   : ${agent.publicKey.toBase58()}`);
  console.log(`  merchant: ${merchant.publicKey.toBase58()}\n`);

  const executeIx = async (
    destination: PublicKey,
    amount: bigint,
  ): Promise<TransactionInstruction> =>
    methods
      .executeTransfer(new BN(amount.toString()))
      .accountsPartial({
        session: agent.publicKey,
        vault,
        mandate,
        mint,
        vaultTokenAccount: vaultAta,
        destinationTokenAccount: destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

  const balanceOf = async (account: PublicKey): Promise<bigint> =>
    (await getAccount(connection, account)).amount;
  const spent = async (): Promise<bigint> =>
    BigInt((await accounts.mandate.fetch(mandate)).spent.toString());

  const results: { scenario: string; verdict: string; signature: string }[] = [];

  /* ---- Demo 1: 3 USDC, di bawah cap -> BERHASIL --------------------------- */
  const vaultBefore = await balanceOf(vaultAta);
  const d1 = await sendAsAgent(connection, agent, await executeIx(merchantAta, 3n * UNIT));
  assertSucceeded("demo 1", d1);
  assert.equal(await balanceOf(merchantAta), 3n * UNIT);
  assert.equal(await balanceOf(vaultAta), vaultBefore - 3n * UNIT);
  assert.equal(await spent(), 3n * UNIT);
  results.push({ scenario: "1. Transfer 3 USDC (cap 5)", verdict: "BERHASIL", signature: d1.signature });
  console.log("demo 1 OK", explorerTx(d1.signature));

  /* ---- Demo 2: 10 USDC, di atas cap -> DITOLAK PROGRAM -------------------- */
  const d2 = await sendAsAgent(connection, agent, await executeIx(merchantAta, 10n * UNIT));
  assertRejectedWith("demo 2", d2, idl.errors, "ExceedsPerActionLimit");
  assert.equal(await balanceOf(merchantAta), 3n * UNIT);
  assert.equal(await spent(), 3n * UNIT);
  results.push({ scenario: "2. Transfer 10 USDC (di atas cap)", verdict: "DITOLAK: ExceedsPerActionLimit", signature: d2.signature });
  console.log("demo 2 OK", explorerTx(d2.signature));


  /* ---- Demo 3: ke wallet agent sendiri -> DITOLAK PROGRAM ----------------- */
  const d3 = await sendAsAgent(connection, agent, await executeIx(agentAta, 3n * UNIT));
  assertRejectedWith("demo 3", d3, idl.errors, "DestinationNotAllowed");
  assert.equal(await balanceOf(agentAta), 0n);
  results.push({ scenario: "3. Kirim ke wallet agent sendiri", verdict: "DITOLAK: DestinationNotAllowed", signature: d3.signature });
  console.log("demo 3 OK", explorerTx(d3.signature));

  /* ---- Demo 4: owner mencabut, transaksi berikutnya langsung ditolak ------ */
  const revokeSig: string = await methods
    .revokeMandate()
    .accountsPartial({ owner: owner.publicKey, vault, mandate })
    .rpc();
  console.log(`revoke_mandate    ${explorerTx(revokeSig)}`);

  const d4 = await sendAsAgent(connection, agent, await executeIx(merchantAta, UNIT));
  assertRejectedWith("demo 4", d4, idl.errors, "MandateIsRevoked");
  assert.equal(await balanceOf(merchantAta), 3n * UNIT);
  results.push({ scenario: "4. Transfer setelah revoke", verdict: "DITOLAK: MandateIsRevoked", signature: d4.signature });
  console.log("demo 4 OK", explorerTx(d4.signature));

  /* ---- Ringkasan ---------------------------------------------------------- */
  console.log("\n================ HASIL ================");
  for (const r of results) {
    console.log(`${r.scenario}\n  -> ${r.verdict}\n  ${explorerTx(r.signature)}`);
  }
  console.log("\nSemua assert lulus: aturan ditegakkan oleh program onchain.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});