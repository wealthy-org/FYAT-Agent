
import { NextResponse, type NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";

import { handleApi } from "@/server/api/handler";
import { ApiErrors } from "@/server/api/errors";
import { recoverMandateBodySchema } from "@/server/api/schemas";
import { serializeMandate } from "@/server/api/serializers";
import { readSignedJson } from "@/server/auth/signed-request";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import {
  OnchainReadError,
  readMandate,
} from "@/server/onchain/mandate-reader";
import {
  findMandateByPda,
  insertMandate,
} from "@/server/repositories/mandates";
import { findVaultByPda } from "@/server/repositories/vaults";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { deriveVaultAddress } from "@/server/solana/vault-address";

export const runtime = "nodejs";

const CREATE_DISCRIMINATOR = [230, 170, 158, 68, 33, 169, 16, 158];

export async function POST(req: NextRequest) {
  return handleApi(req, RATE_LIMITS.mandateWrite, async () => {
    const { wallet, body } = await readSignedJson(
      req,
      recoverMandateBodySchema,
    );

    const { mandatePda, createSignature } = body;
    const env = getServerEnv();
    const connection = getConnection();

    const vault = await findVaultByPda(deriveVaultAddress(wallet));

    if (!vault || vault.ownerPubkey !== wallet) {
      throw ApiErrors.notFound("Vault not found. Register your vault first.");
    }

    if (await findMandateByPda(mandatePda)) {
      throw ApiErrors.validation([
        {
          path: "mandatePda",
          message: "This mandate is already registered",
        },
      ]);
    }

    let onchain;

    try {
      onchain = await readMandate(connection, {
        mandatePda,
        programId: env.FYAT_PROGRAM_ID,
      });
    } catch (error) {
      if (error instanceof OnchainReadError) {
        throw ApiErrors.validation([
          { path: "mandatePda", message: error.message },
        ]);
      }
      throw error;
    }

    const expectedVault = deriveVaultAddress(wallet);

    if (onchain.vault !== expectedVault || onchain.vault !== vault.vaultPda) {
      throw ApiErrors.validation([
        {
          path: "mandatePda",
          message: "Mandate does not belong to your vault",
        },
      ]);
    }

    if (onchain.revokedAt !== 0n || onchain.spent !== 0n) {
      throw ApiErrors.validation([
        {
          path: "mandatePda",
          message: "Only fresh, non-revoked mandates can be recovered",
        },
      ]);
    }

    const tx = await connection.getTransaction(createSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || tx.meta?.err) {
      throw ApiErrors.validation([
        {
          path: "createSignature",
          message: "Successful create transaction was not found",
        },
      ]);
    }

    const keys = tx.transaction.message.getAccountKeys({
      accountKeysFromLookups: tx.meta?.loadedAddresses,
    });

    const owner = new PublicKey(wallet);
    const program = new PublicKey(env.FYAT_PROGRAM_ID);
    const mandate = new PublicKey(mandatePda);

    const ownerIndex = keys.staticAccountKeys.findIndex((key) =>
      key.equals(owner),
    );

    if (
      ownerIndex < 0 ||
      ownerIndex >= tx.transaction.message.header.numRequiredSignatures
    ) {
      throw ApiErrors.validation([
        {
          path: "createSignature",
          message: "Transaction was not signed by the owner",
        },
      ]);
    }

    const hasCreateInstruction =
      tx.transaction.message.compiledInstructions.some((ix) => {
        const ixProgram = keys.get(ix.programIdIndex);

        if (!ixProgram?.equals(program)) return false;

        const isCreate = CREATE_DISCRIMINATOR.every(
          (byte, index) => ix.data[index] === byte,
        );

        return (
          isCreate &&
          ix.accountKeyIndexes.some((index) =>
            keys.get(index)?.equals(mandate),
          )
        );
      });

    if (!hasCreateInstruction) {
      throw ApiErrors.validation([
        {
          path: "createSignature",
          message: "Transaction does not create this mandate",
        },
      ]);
    }

    const result = await insertMandate({
      vaultId: vault.id,
      sessionPubkey: onchain.session,
      action: "TRANSFER",
      target: onchain.recipient,
      maxPerAction: onchain.maxPerAction,
      maxTotal: onchain.maxTotal,
      createdAt: new Date(Number(onchain.createdAt) * 1000),
      expiresAt: new Date(Number(onchain.expiresAt) * 1000),
      onchain: {
        mandatePda: onchain.pda,
        onchainId: onchain.id,
        createSignature,
      },
    });

    return NextResponse.json(
      { mandate: serializeMandate(result), recovered: true },
      { status: 201 },
    );
  });
}
