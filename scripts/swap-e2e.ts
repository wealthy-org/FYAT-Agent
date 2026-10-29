/**
 * E2E Devnet untuk execute_swap: agent menukar USDC tes ke token pasangan lewat
 * pool Meteora DAMM v2, di bawah mandate. Semua penolakan datang dari program.
 *
 * Jalankan:  pnpm exec tsx --env-file=.env.local scripts/swap-e2e.ts
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";

import * as anchor from "@coral-xyz/anchor";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";

import { findMandatePda } from "../src/lib/mandate-address";
import {
  DAMM_PROGRAM_ID,
  deriveEventAuthority,
  derivePoolAuthority,
} from "../src/lib/meteora";
import { findVaultPda } from "../src/lib/vault-address";
import { errorNameFromLogs, explorerTx, sendAsAgent } from "./lib/agent-tx";
import { loadPayer } from "./lib/dev-payer";

const { BN } = anchor;

const UNIT = 1_000_000n;
const CAP = 5n * UNIT; // batas per swap
const BUDGET = 12n * UNIT; // total anggaran
const VAULT_FUNDING = 20n * UNIT;
const AGENT_SOL = 0.02 * LAMPORTS_PER_SOL;
const LIFETIME_SECONDS = 24 * 60 * 60;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local`);
  return value;
}

type IdlError = { code: number; name: string };
type IdlJson = anchor.Idl & { errors: IdlError[] };

function loadIdl(): IdlJson {
  const file = path.join(process.cwd(), "src", "lib", "idl", "fyat_mandate.json");
  return JSON.parse(readFileSync(file, "utf8")) as IdlJson;
}

type Outcome = { signature: string; err: unknown; logs: string[] };

function assertSucceeded(label: string, o: Outcome): void {
  assert.equal(
    o.err,
    null,
    `${label}: expected success, got ${JSON.stringify(o.err)}\n${o.logs.join("\n")}`,
  );
}

function assertRejectedWith(
  label: string,
  o: Outcome,
  errors: IdlError[],
  name: string,
): void {
  const code = errors.find((e) => e.name === name)?.code;
  assert.ok(code !== undefined, `${name} is not in the IDL`);
  assert.notEqual(o.err, null, `${label}: expected ${name}, but it succeeded`);
  const text = `${o.logs.join("\n")}\n${JSON.stringify(o.err)}`;
  assert.ok(
    text.includes(`Error Code: ${name}`) ||
      text.includes(`"Custom":${code}`) ||
      text.includes(`custom program error: 0x${code.toString(16)}`),
    `${label}: rejected, but not with ${name} (${code}).\n${text}`,
  );
}

async function main(): Promise<void> {
  if ((process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") !== "devnet") {
    throw new Error("Devnet only.");
  }

  const owner = await loadPayer();
  if (!owner) throw new Error("No dev keypair. Run `pnpm mint:setup` first.");
  const ownerPublicKey = owner.publicKey;

  const mint = new PublicKey(requireEnv("NEXT_PUBLIC_TOKEN_MINT"));
  const outputMint = new PublicKey(requireEnv("NEXT_PUBLIC_SWAP_OUTPUT_MINT"));
  const pool = new PublicKey(requireEnv("NEXT_PUBLIC_DAMM_POOL"));
  const programId = new PublicKey(requireEnv("FYAT_PROGRAM_ID"));
  const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  console.log("RPC:", new URL(rpcUrl).host);
  const connection = new Connection(rpcUrl, "confirmed");

  const idl = loadIdl();
  assert.equal(idl.address, programId.toBase58(), "IDL address != FYAT_PROGRAM_ID");

  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(owner), {
    commitment: "confirmed",
  });
  const program = new anchor.Program(idl, provider);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = program.account as any;

  /* ---- 1. Pool dan vault -------------------------------------------------- */
  const poolState = await new CpAmm(connection).fetchPoolState(pool);
  const poolMints = [poolState.tokenAMint.toBase58(), poolState.tokenBMint.toBase58()].sort();
  assert.deepEqual(
    poolMints,
    [mint.toBase58(), outputMint.toBase58()].sort(),
    "Pool mints do not match NEXT_PUBLIC_TOKEN_MINT / NEXT_PUBLIC_SWAP_OUTPUT_MINT",
  );

  const vault = new PublicKey(
    findVaultPda({
      owner: owner.publicKey.toBase58(),
      mint: mint.toBase58(),
      programId: programId.toBase58(),
    }),
  );
  const vaultAta = getAssociatedTokenAddressSync(mint, vault, true);

  if (!(await connection.getAccountInfo(vault))) {
    await methods
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
    console.log("Vault created.");
  }

  const ownerAta = await getOrCreateAssociatedTokenAccount(connection, owner, mint, owner.publicKey);
  const vaultBalance = (await getAccount(connection, vaultAta)).amount;
  if (vaultBalance < VAULT_FUNDING) {
    const missing = VAULT_FUNDING - vaultBalance;
    if (ownerAta.amount < missing) {
      await mintTo(connection, owner, mint, ownerAta.address, owner, missing - ownerAta.amount);
    }
    await methods
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
    console.log("Vault funded.");
  }

  // Token account output HARUS sudah ada sebelum execute_swap (ATA milik vault).
  const vaultOutAta = (
    await getOrCreateAssociatedTokenAccount(connection, owner, outputMint, vault, true)
  ).address;

  /* ---- 2. Agent dan dua mandate swap -------------------------------------- */
  const agent = Keypair.generate();
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
  console.log(`Agent: ${agent.publicKey.toBase58()}\n`);

  const slot = await connection.getSlot("confirmed");
  const now = (await connection.getBlockTime(slot)) ?? Math.floor(Date.now() / 1000);

  /** Membuat mandate swap yang menyetujui `approvedPool`. Mengembalikan PDA-nya. */
  async function createSwapMandate(approvedPool: PublicKey): Promise<PublicKey> {
    const vaultState = await accounts.vault.fetch(vault);
    const id = BigInt(vaultState.nextMandateId.toString());
    const mandate = new PublicKey(
      findMandatePda({
        vault: vault.toBase58(),
        id,
        programId: programId.toBase58(),
      }),
    );
    const sig: string = await methods
      .createSwapMandate({
        session: agent.publicKey,
        recipient: approvedPool, // ASUMSI: untuk swap, field ini berisi alamat pool
        maxPerAction: new BN(CAP.toString()),
        maxTotal: new BN(BUDGET.toString()),
        expiresAt: new BN(now + LIFETIME_SECONDS),
      })
      .accountsPartial({
        owner: ownerPublicKey,
        vault,
        mandate,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`create_swap_mandate #${id}  ${explorerTx(sig)}`);
    return mandate;
  }

  const mandate = await createSwapMandate(pool);
  const wrongPoolMandate = await createSwapMandate(Keypair.generate().publicKey);

  /* ---- 3. Instruksi execute_swap ------------------------------------------ */
  const executeSwapIx = async (
    mandateKey: PublicKey,
    amountIn: bigint,
    minimumAmountOut: bigint,
    vaultOutput: PublicKey = vaultOutAta,
  ): Promise<TransactionInstruction[]> => {
    const swapIx: TransactionInstruction = await methods
      .executeSwap(new BN(amountIn.toString()), new BN(minimumAmountOut.toString()))
      .accountsPartial({
        session: agent.publicKey,
        vault,
        mandate: mandateKey,
        mint,
        vaultTokenAccount: vaultAta,
        outputMint,
        vaultOutputTokenAccount: vaultOutput,
        pool,
        poolAuthority: derivePoolAuthority(),
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        eventAuthority: deriveEventAuthority(),
        ammProgram: new PublicKey(DAMM_PROGRAM_ID),
      })
      .instruction();
    return [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), swapIx];
  };

  const balanceOf = async (account: PublicKey): Promise<bigint> =>
    (await getAccount(connection, account)).amount;
  const spent = async (key: PublicKey): Promise<bigint> =>
    BigInt((await accounts.mandate.fetch(key)).spent.toString());

  const results: { scenario: string; verdict: string; signature: string }[] = [];

  /* ---- Demo 1: swap 3 USDC, di bawah cap -> BERHASIL ----------------------- */
  const inBefore = await balanceOf(vaultAta);
  const outBefore = await balanceOf(vaultOutAta);
  const s1 = await sendAsAgent(connection, agent, await executeSwapIx(mandate, 3n * UNIT, 1n));
  assertSucceeded("swap 1", s1);
  const inAfter = await balanceOf(vaultAta);
  const outAfter = await balanceOf(vaultOutAta);
  assert.ok(inAfter < inBefore, "the vault's USDC balance should decrease");
  assert.ok(outAfter > outBefore, "the vault's output token balance should increase");
  assert.ok(inBefore - inAfter <= 3n * UNIT, "input used must not exceed amount_in");
  assert.equal(await spent(mandate), inBefore - inAfter, "spent must equal the amount of input used");
  console.log(`swap 1 OK: -${inBefore - inAfter} USDC, +${outAfter - outBefore} output`, explorerTx(s1.signature));
  results.push({ scenario: "1. Swap 3 USDC (cap 5)", verdict: "SUCCESS", signature: s1.signature });

  /* ---- Demo 2: swap 10 USDC, di atas cap -> DITOLAK ------------------------ */
  const s2 = await sendAsAgent(connection, agent, await executeSwapIx(mandate, 10n * UNIT, 1n));
  assertRejectedWith("swap 2", s2, idl.errors, "ExceedsPerActionLimit");
  results.push({ scenario: "2. Swap 10 USDC (over cap)", verdict: "REJECTED: ExceedsPerActionLimit", signature: s2.signature });
  console.log("swap 2 OK", explorerTx(s2.signature));

    /* ---- Demo 3: minimum_amount_out mustahil -> DITOLAK ---------------------- */
  // Batas ini ditegakkan pool Meteora lewat CPI (ExceededSlippage, 6002), sebelum
  // pemeriksaan SlippageExceeded milik program kita (lapisan kedua).
  const s3 = await sendAsAgent(connection, agent, await executeSwapIx(mandate, 1n * UNIT, 1_000_000n * UNIT));
  assert.notEqual(s3.err, null, "swap 3: expected a rejection");
  const s3Error = errorNameFromLogs(s3.logs);
  assert.ok(
    s3Error === "ExceededSlippage" || s3Error === "SlippageExceeded",
    `swap 3: rejected for a reason other than slippage (${s3Error ?? "unknown error"}).\n${s3.logs.join("\n")}`,
  );
  results.push({ scenario: "3. minimum_amount_out too high", verdict: `REJECTED: ${s3Error}`, signature: s3.signature });
  console.log("swap 3 OK", s3Error, explorerTx(s3.signature));

  /* ---- Demo 4: mandate untuk pool lain -> DITOLAK -------------------------- */
  const s4 = await sendAsAgent(connection, agent, await executeSwapIx(wrongPoolMandate, 1n * UNIT, 1n));
  assertRejectedWith("swap 4", s4, idl.errors, "PoolNotAllowed");
  results.push({ scenario: "4. Pool not approved by the mandate", verdict: "REJECTED: PoolNotAllowed", signature: s4.signature });
  console.log("swap 4 OK", explorerTx(s4.signature));

  /* ---- Demo 5: hasil swap dialihkan ke wallet agent -> DITOLAK -------------- */
  const agentOutAta = (
    await getOrCreateAssociatedTokenAccount(connection, owner, outputMint, agent.publicKey)
  ).address;
  const s5 = await sendAsAgent(connection, agent, await executeSwapIx(mandate, 1n * UNIT, 1n, agentOutAta));
  assert.notEqual(s5.err, null, "swap 5: redirecting output to the agent's wallet should be rejected");
  assert.equal(await balanceOf(agentOutAta), 0n, "swap 5: the agent's wallet must not receive any tokens");
  results.push({
    scenario: "5. Redirect swap output to the agent's wallet",
    verdict: `REJECTED: ${errorNameFromLogs(s5.logs) ?? "account constraint"}`,
    signature: s5.signature,
  });
  console.log("swap 5 OK", explorerTx(s5.signature));

  /* ---- Demo 6: revoke, lalu swap -> DITOLAK -------------------------------- */
  const revokeSig: string = await methods
    .revokeMandate()
    .accountsPartial({ owner: owner.publicKey, vault, mandate })
    .rpc();
  console.log(`revoke_mandate  ${explorerTx(revokeSig)}`);
  const s6 = await sendAsAgent(connection, agent, await executeSwapIx(mandate, 1n * UNIT, 1n));
  assertRejectedWith("swap 6", s6, idl.errors, "MandateIsRevoked");
  results.push({ scenario: "6. Swap after revoke", verdict: "REJECTED: MandateIsRevoked", signature: s6.signature });
  console.log("swap 6 OK", explorerTx(s6.signature));

  console.log("\n================ RESULTS ================");
  for (const r of results) {
    console.log(`${r.scenario}\n  -> ${r.verdict}\n  ${explorerTx(r.signature)}`);
  }
  console.log("\nAll assertions passed: the on-chain program enforced the swap rules.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});