import "server-only";

import { Connection, PublicKey } from "@solana/web3.js";

import { VerificationError } from "./verification-error";

/**
 * Memastikan signature adalah transaksi sukses, ditandatangani owner, dan
 * memuat instruksi program dengan discriminator tertentu yang menyebut `account`.
 */
export async function assertOwnerInstruction(
  connection: Connection,
  args: {
    signature: string;
    owner: string;
    programId: string;
    discriminator: number[];
    account: string;
  },
): Promise<void> {
  const fail = (m: string): never => {
    throw new VerificationError(m);
  };

  let tx = null;
  for (let attempt = 0; attempt < 6 && !tx; attempt++) {
    tx = await connection.getTransaction(args.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) await new Promise((r) => setTimeout(r, 750));
  }
  if (!tx) fail("Transaction not found");
  if (tx!.meta?.err) fail("Transaction failed onchain");

  const message = tx!.transaction.message;
  const keys = message.getAccountKeys({
    accountKeysFromLookups: tx!.meta?.loadedAddresses,
  });
  const owner = new PublicKey(args.owner);
  const program = new PublicKey(args.programId);
  const account = new PublicKey(args.account);

  const ownerIndex = message.staticAccountKeys.findIndex((k) => k.equals(owner));
  if (ownerIndex < 0 || ownerIndex >= message.header.numRequiredSignatures) {
    fail("Transaction was not signed by the owner");
  }

  const matched = message.compiledInstructions.some((ix) => {
    if (!keys.get(ix.programIdIndex)?.equals(program)) return false;
    if (!args.discriminator.every((b, i) => ix.data[i] === b)) return false;
    return ix.accountKeyIndexes.some((i) => keys.get(i)?.equals(account));
  });
  if (!matched) fail("Transaction does not match the expected instruction");
}