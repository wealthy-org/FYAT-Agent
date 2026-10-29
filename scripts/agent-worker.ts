import { readFileSync } from "node:fs";
import path from "node:path";

import * as anchor from "@coral-xyz/anchor";
import {
  CpAmm,
  getCurrentPoint,
  swapQuoteExactInput,
} from "@meteora-ag/cp-amm-sdk";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { Client } from "pg";

import {
  deriveEventAuthority,
  derivePoolAuthority,
  deriveVaultTokenAccount,
  DAMM_PROGRAM_ID,
} from "../src/lib/meteora";
import { findVaultPda } from "../src/lib/vault-address";
import { loadAgentKeypair } from "./lib/agent-tx";

type JobRow = {
  id: string;
  mandate_id: string;
  amount: string;
  mandate_pda: string;
  session_pubkey: string;
  allowed_action: "TRANSFER" | "SWAP";
  allowed_target: string;
};

const POLL_INTERVAL_MS = 3_000;
const STALE_AFTER_MINUTES = 5;
const SLIPPAGE_TOLERANCE = 0.01;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in the Railway service variables.`);
  return value;
}

function getAgent() {
  requireEnv("AGENT_SECRET_KEY");
  return loadAgentKeypair();
}

function buildProgram(connection: Connection, agent: Keypair) {
  const idl = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "src", "lib", "idl", "fyat_mandate.json"),
      "utf8",
    ),
  ) as anchor.Idl;
  const configuredProgramId = requireEnv("FYAT_PROGRAM_ID");
  if ("address" in idl && idl.address !== configuredProgramId) {
    throw new Error(
      "FYAT_PROGRAM_ID does not match the checked-in program IDL.",
    );
  }
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(agent),
    { commitment: "confirmed", preflightCommitment: "confirmed" },
  );
  const program = new anchor.Program(idl, provider);
  // The program interface is loaded dynamically from the checked-in IDL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = program.account as any;
  return { program, methods, accounts };
}

async function notifyResult(
  jobId: string,
  body:
    { status: "SUCCEEDED" } | { status: "FAILED" | "UNKNOWN"; error: string },
): Promise<void> {
  const baseUrl = requireEnv("APP_URL").replace(/\/+$/, "");
  const response = await fetch(
    `${baseUrl}/api/worker/agent-jobs/${encodeURIComponent(jobId)}/result`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("WORKER_API_SECRET")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Could not record job ${jobId} result (HTTP ${response.status}).`,
    );
  }
}

async function claimJob(client: Client): Promise<JobRow | null> {
  const result = await client.query<JobRow>(
    `WITH next_job AS (
       SELECT id
         FROM agent_jobs
        WHERE status = 'QUEUED'
        ORDER BY created_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
     )
     UPDATE agent_jobs AS j
        SET status = 'PROCESSING',
            attempts = attempts + 1,
            locked_at = now(),
            updated_at = now()
       FROM next_job, mandates AS m
      WHERE j.id = next_job.id
        AND m.id = j.mandate_id
     RETURNING j.id, j.mandate_id, j.amount,
               m.mandate_pda, m.session_pubkey,
               m.allowed_action, m.allowed_target`,
  );
  return result.rows[0] ?? null;
}

async function setTransactionSignature(
  client: Client,
  jobId: string,
  signature: string,
): Promise<void> {
  const result = await client.query(
    `UPDATE agent_jobs
        SET tx_signature = $2, updated_at = now()
      WHERE id = $1 AND status = 'PROCESSING' AND tx_signature IS NULL`,
    [jobId, signature],
  );
  if (result.rowCount !== 1) {
    throw new Error(
      `Could not persist transaction signature for job ${jobId}.`,
    );
  }
}

async function buildTransaction(
  job: JobRow,
  connection: Connection,
  agent: Keypair,
) {
  const { methods, accounts } = buildProgram(connection, agent);
  const mandatePda = new PublicKey(job.mandate_pda);
  const mandate = await accounts.mandate.fetch(mandatePda);
  const vaultState = await accounts.vault.fetch(mandate.vault);

  if (
    !mandate.session.equals(agent.publicKey) ||
    (job.allowed_action === "TRANSFER" && !("transfer" in mandate.action)) ||
    (job.allowed_action === "SWAP" && !("swap" in mandate.action)) ||
    !mandate.recipient.equals(new PublicKey(job.allowed_target))
  ) {
    throw new Error("On-chain mandate details do not match this queued job.");
  }

  const amount = BigInt(job.amount);
  const maxPerAction = BigInt(mandate.maxPerAction.toString());
  const maxTotal = BigInt(mandate.maxTotal.toString());
  const spent = BigInt(mandate.spent.toString());
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  if (
    mandate.revokedAt.toString() !== "0" ||
    BigInt(mandate.expiresAt.toString()) <= nowSeconds
  ) {
    throw new Error("The on-chain mandate is revoked or expired.");
  }
  if (amount <= 0n || amount > maxPerAction || spent + amount > maxTotal) {
    throw new Error("The queued amount exceeds the on-chain mandate limits.");
  }

  const programId = new PublicKey(requireEnv("FYAT_PROGRAM_ID"));
  const vault = new PublicKey(
    findVaultPda({
      owner: vaultState.owner.toBase58(),
      mint: vaultState.mint.toBase58(),
      programId: programId.toBase58(),
    }),
  );
  if (!mandate.vault.equals(vault)) {
    throw new Error("The on-chain vault does not match the mandate.");
  }
  const mint = vaultState.mint as PublicKey;
  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, vault, true);
  const transaction = new Transaction();

  if (job.allowed_action === "TRANSFER") {
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      mint,
      new PublicKey(job.allowed_target),
    );
    if (
      !(await connection.getAccountInfo(destinationTokenAccount, "confirmed"))
    ) {
      throw new Error("The recipient token account does not exist.");
    }
    transaction.add(
      await methods
        .executeTransfer(new anchor.BN(amount.toString()))
        .accountsPartial({
          session: agent.publicKey,
          vault,
          mandate: mandatePda,
          mint,
          vaultTokenAccount,
          destinationTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction(),
    );
    return transaction;
  }

  const poolString = requireEnv("NEXT_PUBLIC_DAMM_POOL");
  const outputMintString = requireEnv("NEXT_PUBLIC_SWAP_OUTPUT_MINT");
  const configuredInput = requireEnv("NEXT_PUBLIC_TOKEN_MINT");
  if (
    configuredInput !== mint.toBase58() ||
    poolString !== job.allowed_target
  ) {
    throw new Error(
      "The worker swap configuration does not match this mandate.",
    );
  }

  const pool = new PublicKey(poolString);
  const outputMint = new PublicKey(outputMintString);
  const poolState = await new CpAmm(connection).fetchPoolState(pool);
  const inputIsTokenA = poolState.tokenAMint.equals(mint);
  const pairMatches =
    (inputIsTokenA && poolState.tokenBMint.equals(outputMint)) ||
    (poolState.tokenBMint.equals(mint) &&
      poolState.tokenAMint.equals(outputMint));
  if (!pairMatches)
    throw new Error("The configured DAMM pool does not match the token pair.");

  const [decimalsA, decimalsB] = await Promise.all([
    getMint(connection, poolState.tokenAMint, "confirmed", TOKEN_PROGRAM_ID),
    getMint(connection, poolState.tokenBMint, "confirmed", TOKEN_PROGRAM_ID),
  ]);
  const point = await getCurrentPoint(connection, poolState.activationType);
  const quote = swapQuoteExactInput(
    poolState,
    point,
    new anchor.BN(amount.toString()),
    SLIPPAGE_TOLERANCE,
    inputIsTokenA,
    false,
    decimalsA.decimals,
    decimalsB.decimals,
  );
  if (!quote.minimumAmountOut || quote.minimumAmountOut.lten(0)) {
    throw new Error("Meteora could not provide a valid swap quote.");
  }

  const outputAccount = deriveVaultTokenAccount(
    vault.toBase58(),
    outputMint.toBase58(),
  );
  const inputAccount = deriveVaultTokenAccount(
    vault.toBase58(),
    mint.toBase58(),
  );
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    createAssociatedTokenAccountIdempotentInstruction(
      agent.publicKey,
      outputAccount,
      vault,
      outputMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    await methods
      .executeSwap(new anchor.BN(amount.toString()), quote.minimumAmountOut)
      .accountsPartial({
        session: agent.publicKey,
        vault,
        mandate: mandatePda,
        mint,
        vaultTokenAccount: inputAccount,
        outputMint,
        vaultOutputTokenAccount: outputAccount,
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
      .instruction(),
  );
  return transaction;
}

async function executeJob(
  job: JobRow,
  client: Client,
  connection: Connection,
  agent: Keypair,
): Promise<void> {
  let signaturePersisted = false;
  try {
    if (job.session_pubkey !== agent.publicKey.toBase58()) {
      throw new Error("The agent key does not match the mandate session key.");
    }
    const transaction = await buildTransaction(job, connection, agent);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.feePayer = agent.publicKey;
    transaction.recentBlockhash = blockhash;
    transaction.sign(agent);

    const simulation = await connection.simulateTransaction(transaction);
    if (simulation.value.err) {
      throw new Error(
        `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`,
      );
    }

    if (!transaction.signature)
      throw new Error("The signed transaction has no signature.");
    const signature = bs58.encode(transaction.signature);
    await setTransactionSignature(client, job.id, signature);
    signaturePersisted = true;

    await connection.sendRawTransaction(transaction.serialize(), {
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    if (confirmation.value.err) {
      await notifyResult(job.id, {
        status: "FAILED",
        error: "The transaction was confirmed as failed on Devnet.",
      });
      return;
    }
    await notifyResult(job.id, { status: "SUCCEEDED" });
    console.info(`[agent-worker] Job ${job.id} succeeded: ${signature}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The agent job failed.";
    console.error(`[agent-worker] Job ${job.id} failed`, error);
    await notifyResult(job.id, {
      status: signaturePersisted ? "UNKNOWN" : "FAILED",
      error: signaturePersisted
        ? "The transaction outcome could not be confirmed. Check its signature before retrying."
        : message.slice(0, 280),
    });
  }
}

async function recoverStaleJobs(
  client: Client,
  connection: Connection,
): Promise<void> {
  const stale = await client.query<{ id: string; tx_signature: string | null }>(
    `SELECT id, tx_signature
       FROM agent_jobs
      WHERE status = 'PROCESSING'
        AND locked_at < now() - ($1::text || ' minutes')::interval
      ORDER BY locked_at
      LIMIT 10`,
    [String(STALE_AFTER_MINUTES)],
  );

  for (const job of stale.rows) {
    if (!job.tx_signature) {
      await client.query(
        `UPDATE agent_jobs
            SET status = 'QUEUED', locked_at = NULL, updated_at = now()
          WHERE id = $1 AND status = 'PROCESSING' AND tx_signature IS NULL`,
        [job.id],
      );
      continue;
    }

    const result = await connection.getSignatureStatuses([job.tx_signature], {
      searchTransactionHistory: true,
    });
    const status = result.value[0];
    if (!status) {
      await notifyResult(job.id, {
        status: "UNKNOWN",
        error:
          "No confirmed transaction was found after the worker stopped. Check the signature before retrying.",
      });
      continue;
    }
    if (
      status.confirmationStatus !== "confirmed" &&
      status.confirmationStatus !== "finalized"
    ) {
      continue;
    }
    if (status.err) {
      await notifyResult(job.id, {
        status: "FAILED",
        error: "The transaction was confirmed as failed on Devnet.",
      });
      continue;
    }
    await notifyResult(job.id, { status: "SUCCEEDED" });
  }
}

async function run(): Promise<void> {
  if ((process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") !== "devnet") {
    throw new Error("The Railway agent worker only supports Devnet.");
  }
  const agent = getAgent();
  const configuredSession = requireEnv("AGENT_SESSION_PUBKEY");
  if (agent.publicKey.toBase58() !== configuredSession) {
    throw new Error("AGENT_SECRET_KEY does not match AGENT_SESSION_PUBKEY.");
  }
  const connection = new Connection(
    process.env.SOLANA_RPC_URL ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      "https://api.devnet.solana.com",
    "confirmed",
  );
  const client = new Client({ connectionString: requireEnv("DATABASE_URL") });
  await client.connect();
  console.info(
    `[agent-worker] Listening for Devnet jobs as ${configuredSession}`,
  );

  for (;;) {
    try {
      await recoverStaleJobs(client, connection);
      const job = await claimJob(client);
      if (job) {
        await executeJob(job, client, connection, agent);
      } else {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (error) {
      console.error("[agent-worker] Poll cycle failed", error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

run().catch((error: unknown) => {
  console.error("[agent-worker] Startup failed", error);
  process.exitCode = 1;
});
