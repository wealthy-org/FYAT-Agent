
import "server-only";

import { PublicKey } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";

import { readMandate } from "./mandate-reader";
import type { MandateAction } from "@/features/builder";
import {
  DAMM_PROGRAM_ID,
  deriveEventAuthority,
  derivePoolAuthority,
  deriveVaultTokenAccount,
} from "@/lib/meteora";

const EXECUTE_TRANSFER_DISCRIMINATOR = [
  233, 126, 160, 184, 235, 206, 31, 119,
];
const EXECUTE_SWAP_DISCRIMINATOR = [
  56, 182, 124, 215, 155, 140, 157, 102,
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
  action: MandateAction;
  sessionPubkey: string;
  mandatePda: string;
  /** Pengeluaran kumulatif mandate menurut chain, setelah transaksi ini. */
  onchainSpent: bigint;
};

type TokenBalanceEntry = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: {
    amount: string;
  };
};

function getTokenBalance(
  balances: TokenBalanceEntry[] | null | undefined,
  accountIndex: number,
  mint: string,
  expectedOwner: string,
  allowMissing = false,
): bigint {
  const matches = balances?.filter(
    (item) =>
      item.accountIndex === accountIndex &&
      item.mint === mint,
  );

  if (!matches || matches.length === 0) {
    if (allowMissing) return 0n;

    throw new ExecutionVerificationError(
      "Token balance metadata is missing",
    );
  }

  if (matches.length !== 1) {
    throw new ExecutionVerificationError(
      "Token balance metadata is ambiguous",
    );
  }

  const balance = matches[0];

  if (
    balance.owner !== undefined &&
    balance.owner !== expectedOwner
  ) {
    throw new ExecutionVerificationError(
      "Token account owner does not match the expected owner",
    );
  }

  return BigInt(balance.uiTokenAmount.amount);
}

export async function verifyExecution(
  connection: Connection,
  input: {
    signature: string;
    programId: string;
    mint: string;
    mandatePda: string;
    sessionPubkey: string;
    action: MandateAction;
    target: string;
    outputMint?: string;
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

    // Sengaja TIDAK ada pemeriksaan status mandate "sekarang" (dicabut/kedaluwarsa).
  // Transaksi ini sudah sukses di chain, artinya program menegakkan semua aturan
  // pada saat eksekusi. Membandingkan dengan keadaan hari ini akan menolak eksekusi
  // yang sah tetapi dicatat setelah owner mencabut mandate atau setelah kedaluwarsa.
  const mandate = await readMandate(connection, {
    mandatePda: input.mandatePda,
    programId: input.programId,
  });

  if (mandate.action !== input.action) {
    throw new ExecutionVerificationError(
      "Mandate action does not match the registered action",
    );
  }

  if (input.action === "SWAP") {
    return verifySwapExecution(connection, tx, mandate, input);
  }

  const message = tx.transaction.message;

  const keys = message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses ?? undefined,
  });

const session = new PublicKey(mandate.session);
const expectedSession = new PublicKey(input.sessionPubkey);

if (!session.equals(expectedSession)) {
  throw new ExecutionVerificationError(
    "Session public key does not match the mandate",
  );
}
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

    const meta = tx.meta;

  if (!meta) {
    throw new ExecutionVerificationError(
      "Transaction metadata is unavailable",
    );
  }

  const accountIndexes = ix.accountKeyIndexes;
  const vaultTokenIndex = accountIndexes[4];
  const destinationTokenIndex = accountIndexes[5];

  if (
    vaultTokenIndex === undefined ||
    destinationTokenIndex === undefined
  ) {
    throw new ExecutionVerificationError(
      "Token account indexes are unavailable",
    );
  }

  const preVault = getTokenBalance(
    meta.preTokenBalances,
    vaultTokenIndex,
    input.mint,
    mandate.vault,
  );

  const postVault = getTokenBalance(
    meta.postTokenBalances,
    vaultTokenIndex,
    input.mint,
    mandate.vault,
  );

  const preDestination = getTokenBalance(
    meta.preTokenBalances,
    destinationTokenIndex,
    input.mint,
    mandate.recipient,
    true,
  );

  const postDestination = getTokenBalance(
    meta.postTokenBalances,
    destinationTokenIndex,
    input.mint,
    mandate.recipient,
  );

  if (preVault - postVault !== amount) {
    throw new ExecutionVerificationError(
      "Vault token balance change does not match the transfer amount",
    );
  }

  if (postDestination - preDestination !== amount) {
    throw new ExecutionVerificationError(
      "Recipient token balance change does not match the transfer amount",
    );
  }

  return {
    amount,
    target: mandate.recipient,
    action: "TRANSFER",
    sessionPubkey: mandate.session,
    mandatePda: mandate.pda,
    onchainSpent: mandate.spent,
  };
}

async function verifySwapExecution(
  connection: Connection,
  tx: NonNullable<
    Awaited<ReturnType<Connection["getTransaction"]>>
  >,
  mandate: Awaited<ReturnType<typeof readMandate>>,
  input: {
    signature: string;
    programId: string;
    mint: string;
    mandatePda: string;
    sessionPubkey: string;
    action: MandateAction;
    target: string;
    outputMint?: string;
  },
): Promise<VerifiedExecution> {
  if (!input.outputMint) {
    throw new ExecutionVerificationError(
      "The configured swap output mint is missing",
    );
  }
  if (mandate.recipient !== input.target) {
    throw new ExecutionVerificationError(
      "Swap pool does not match the registered mandate target",
    );
  }

  const message = tx.transaction.message;
  const keys = message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses ?? undefined,
  });
  const session = new PublicKey(mandate.session);
  const expectedSession = new PublicKey(input.sessionPubkey);
  const program = new PublicKey(input.programId);
  const vault = new PublicKey(mandate.vault);
  const mandatePda = new PublicKey(input.mandatePda);
  const inputMint = new PublicKey(input.mint);
  const outputMint = new PublicKey(input.outputMint);
  const pool = new PublicKey(input.target);
  const sessionIndex = message.staticAccountKeys.findIndex((key) =>
    key.equals(session),
  );
  if (
    !session.equals(expectedSession) ||
    sessionIndex < 0 ||
    sessionIndex >= message.header.numRequiredSignatures
  ) {
    throw new ExecutionVerificationError(
      "Transaction was not signed by the mandate session",
    );
  }

  let poolState;
  try {
    poolState = await new CpAmm(connection).fetchPoolState(pool);
  } catch {
    throw new ExecutionVerificationError(
      "The approved Meteora DAMM pool could not be verified",
    );
  }
  const poolMatchesMints =
    (poolState.tokenAMint.equals(inputMint) &&
      poolState.tokenBMint.equals(outputMint)) ||
    (poolState.tokenBMint.equals(inputMint) &&
      poolState.tokenAMint.equals(outputMint));
  if (!poolMatchesMints) {
    throw new ExecutionVerificationError(
      "The approved DAMM pool does not contain the configured token pair",
    );
  }

  const vaultInputAta = deriveVaultTokenAccount(
    vault.toBase58(),
    inputMint.toBase58(),
  );
  const vaultOutputAta = deriveVaultTokenAccount(
    vault.toBase58(),
    outputMint.toBase58(),
  );
  const matchedInstructions = message.compiledInstructions.filter((ix) => {
    if (!keys.get(ix.programIdIndex)?.equals(program)) return false;
    const data = Buffer.from(ix.data);
    if (
      data.length !== 24 ||
      !EXECUTE_SWAP_DISCRIMINATOR.every(
        (byte, index) => data[index] === byte,
      ) ||
      ix.accountKeyIndexes.length < 16
    ) {
      return false;
    }

    const accounts = ix.accountKeyIndexes.map((index) => keys.get(index));
    return (
      accounts[0]?.equals(session) === true &&
      accounts[1]?.equals(vault) === true &&
      accounts[2]?.equals(mandatePda) === true &&
      accounts[3]?.equals(inputMint) === true &&
      accounts[4]?.equals(vaultInputAta) === true &&
      accounts[5]?.equals(outputMint) === true &&
      accounts[6]?.equals(vaultOutputAta) === true &&
      accounts[7]?.equals(pool) === true &&
      accounts[8]?.equals(derivePoolAuthority()) === true &&
      accounts[9]?.equals(poolState.tokenAVault) === true &&
      accounts[10]?.equals(poolState.tokenBVault) === true &&
      accounts[11]?.equals(poolState.tokenAMint) === true &&
      accounts[12]?.equals(poolState.tokenBMint) === true &&
      accounts[13]?.equals(TOKEN_PROGRAM_ID) === true &&
      accounts[14]?.equals(deriveEventAuthority()) === true &&
      accounts[15]?.equals(new PublicKey(DAMM_PROGRAM_ID)) === true
    );
  });
  if (matchedInstructions.length !== 1) {
    throw new ExecutionVerificationError(
      "Transaction must contain exactly one matching execute_swap instruction",
    );
  }

  const ix = matchedInstructions[0];
  if (!ix) {
    throw new ExecutionVerificationError("Execute swap instruction not found");
  }
  const data = Buffer.from(ix.data);
  const amount = data.readBigUInt64LE(8);
  const minimumAmountOut = data.readBigUInt64LE(16);
  if (amount <= 0n || minimumAmountOut <= 0n) {
    throw new ExecutionVerificationError(
      "Swap input and minimum output must be greater than zero",
    );
  }
  if (
    amount > mandate.maxPerAction ||
    mandate.spent > mandate.maxTotal
  ) {
    throw new ExecutionVerificationError(
      "Swap exceeds the mandate spending limits",
    );
  }

  const meta = tx.meta;
  if (!meta) {
    throw new ExecutionVerificationError(
      "Transaction metadata is unavailable",
    );
  }
  const inputIndex = ix.accountKeyIndexes[4];
  const outputIndex = ix.accountKeyIndexes[6];
  if (inputIndex === undefined || outputIndex === undefined) {
    throw new ExecutionVerificationError("Swap token account indexes are unavailable");
  }
  const inputBefore = getTokenBalance(
    meta.preTokenBalances,
    inputIndex,
    inputMint.toBase58(),
    vault.toBase58(),
  );
  const inputAfter = getTokenBalance(
    meta.postTokenBalances,
    inputIndex,
    inputMint.toBase58(),
    vault.toBase58(),
  );
  const outputBefore = getTokenBalance(
    meta.preTokenBalances,
    outputIndex,
    outputMint.toBase58(),
    vault.toBase58(),
    true,
  );
  const outputAfter = getTokenBalance(
    meta.postTokenBalances,
    outputIndex,
    outputMint.toBase58(),
    vault.toBase58(),
  );
  const actualInput = inputBefore - inputAfter;
  const actualOutput = outputAfter - outputBefore;

  if (actualInput !== amount) {
    throw new ExecutionVerificationError(
      "Vault input balance change does not match the swap instruction",
    );
  }
  if (actualOutput < minimumAmountOut) {
    throw new ExecutionVerificationError(
      "Vault output balance change is below the minimum swap output",
    );
  }

  return {
    amount: actualInput,
    target: mandate.recipient,
    action: "SWAP",
    sessionPubkey: mandate.session,
    mandatePda: mandate.pda,
    onchainSpent: mandate.spent,
  };
}
