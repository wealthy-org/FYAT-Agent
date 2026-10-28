
import "server-only";

import { PublicKey } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

import { readMandate } from "./mandate-reader";

const EXECUTE_TRANSFER_DISCRIMINATOR = [
  233, 126, 160, 184, 235, 206, 31, 119,
];

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

export class ExecutionVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionVerificationError";
  }
}

export type VerifiedExecution = {
  amount: bigint;
  target: string;
  sessionPubkey: string;
  mandatePda: string;
};

export async function verifyExecution(
  connection: Connection,
  input: {
    signature: string;
    programId: string;
    mint: string;
    mandatePda: string;
  },
): Promise<VerifiedExecution> {
  const tx = await connection.getTransaction(input.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (tx === null) {
    throw new ExecutionVerificationError(
      "Transaction not found or not confirmed",
    );
  }

  if (tx.meta?.err) {
    throw new ExecutionVerificationError(
      "Transaction failed onchain",
    );
  }

  const blockTime = tx.blockTime;

  if (blockTime === null || blockTime === undefined) {
    throw new ExecutionVerificationError(
      "Transaction block time is unavailable",
    );
  }

  const mandate = await readMandate(connection, {
    mandatePda: input.mandatePda,
    programId: input.programId,
  });

  if (mandate.revokedAt !== 0n) {
    throw new ExecutionVerificationError(
      "Mandate has been revoked",
    );
  }

  if (BigInt(blockTime) >= mandate.expiresAt) {
    throw new ExecutionVerificationError(
      "Mandate had expired when the transaction was processed",
    );
  }

  if (BigInt(Math.floor(Date.now() / 1000)) >= mandate.expiresAt) {
    throw new ExecutionVerificationError("Mandate has expired");
  }

  const message = tx.transaction.message;

  const keys = message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses ?? undefined,
  });

  const session = new PublicKey(mandate.session);
  const program = new PublicKey(input.programId);
  const mint = new PublicKey(input.mint);
  const vault = new PublicKey(mandate.vault);
  const mandatePda = new PublicKey(input.mandatePda);
  const recipient = new PublicKey(mandate.recipient);

  const sessionIndex = message.staticAccountKeys.findIndex((key) =>
    key.equals(session),
  );

  if (
    sessionIndex < 0 ||
    sessionIndex >= message.header.numRequiredSignatures
  ) {
    throw new ExecutionVerificationError(
      "Transaction was not signed by the mandate session",
    );
  }

  const vaultTokenAccount = getAssociatedTokenAddressSync(
    mint,
    vault,
    true,
  );

  const destinationTokenAccount = getAssociatedTokenAddressSync(
    mint,
    recipient,
    true,
  );

  const matchedInstructions = message.compiledInstructions.filter((ix) => {
    if (!keys.get(ix.programIdIndex)?.equals(program)) {
      return false;
    }

    // Pada versi web3.js proyek ini, instruction data berupa Uint8Array.
    const data = Buffer.from(ix.data);

    if (
      data.length !== 16 ||
      !EXECUTE_TRANSFER_DISCRIMINATOR.every(
        (byte, index) => data[index] === byte,
      )
    ) {
      return false;
    }

    if (ix.accountKeyIndexes.length < 7) {
      return false;
    }

    const accountIndexes = ix.accountKeyIndexes;

    const sessionAccount = keys.get(accountIndexes[0]);
    const vaultAccount = keys.get(accountIndexes[1]);
    const mandateAccount = keys.get(accountIndexes[2]);
    const mintAccount = keys.get(accountIndexes[3]);
    const vaultToken = keys.get(accountIndexes[4]);
    const destinationToken = keys.get(accountIndexes[5]);
    const tokenProgram = keys.get(accountIndexes[6]);

    return (
      sessionAccount?.equals(session) === true &&
      vaultAccount?.equals(vault) === true &&
      mandateAccount?.equals(mandatePda) === true &&
      mintAccount?.equals(mint) === true &&
      vaultToken?.equals(vaultTokenAccount) === true &&
      destinationToken?.equals(destinationTokenAccount) === true &&
      tokenProgram?.equals(TOKEN_PROGRAM_ID) === true
    );
  });

  if (matchedInstructions.length !== 1) {
    throw new ExecutionVerificationError(
      "Transaction must contain exactly one matching execute_transfer instruction",
    );
  }

  const ix = matchedInstructions[0];

  if (ix === undefined) {
    throw new ExecutionVerificationError(
      "Execute transfer instruction not found",
    );
  }

  const data = Buffer.from(ix.data);
  const amount = data.readBigUInt64LE(8);

  if (amount <= 0n) {
    throw new ExecutionVerificationError(
      "Transfer amount must be greater than zero",
    );
  }

  if (amount > mandate.maxPerAction) {
    throw new ExecutionVerificationError(
      "Transfer exceeds the per-action limit",
    );
  }

  if (mandate.spent + amount > mandate.maxTotal) {
    throw new ExecutionVerificationError(
      "Transfer exceeds the mandate's remaining budget",
    );
  }

  return {
    amount,
    target: mandate.recipient,
    sessionPubkey: mandate.session,
    mandatePda: mandate.pda,
  };
}
