import { NextResponse, type NextRequest } from "next/server";

import { ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import { recoverMandateBodySchema } from "@/server/api/schemas";
import { serializeMandate } from "@/server/api/serializers";
import { readSignedJson } from "@/server/auth/signed-request";
import { isUniqueViolation } from "@/server/db/client";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import {
  OnchainReadError,
  readMandate,
} from "@/server/onchain/mandate-reader";
import {
  CREATE_MANDATE_DISCRIMINATOR,
} from "@/server/onchain/verify-create";
import { VerificationError } from "@/server/onchain/verification-error";
import { assertOwnerInstruction } from "@/server/onchain/verify-tx";
import {
  findMandateByPda,
  insertMandate,
} from "@/server/repositories/mandates";
import { findVaultByPda } from "@/server/repositories/vaults";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { deriveVaultAddress } from "@/server/solana/vault-address";

export const runtime = "nodejs";

const ALREADY_REGISTERED = "This mandate is already registered";

export async function POST(req: NextRequest) {
  return handleApi(req, RATE_LIMITS.mandateWrite, async () => {
    const { wallet, body } = await readSignedJson(
      req,
      recoverMandateBodySchema,
    );
    const { mandatePda, createSignature } = body;

    const env = getServerEnv();
    const connection = getConnection();

    // Vault diturunkan dari wallet yang TERBUKTI, bukan dari input klien.
    const vault = await findVaultByPda(deriveVaultAddress(wallet));
    if (!vault || vault.ownerPubkey !== wallet) {
      throw ApiErrors.notFound("Vault not found. Register your vault first.");
    }

    if (await findMandateByPda(mandatePda)) {
      throw ApiErrors.validation([
        { path: "mandatePda", message: ALREADY_REGISTERED },
      ]);
    }

    let onchain;
    try {
      onchain = await readMandate(connection, {
        mandatePda,
        programId: env.FYAT_PROGRAM_ID,
      });

      if (onchain.vault !== vault.vaultPda) {
        throw new VerificationError("Mandate does not belong to your vault");
      }
      if (onchain.revokedAt !== 0n || onchain.spent !== 0n) {
        throw new VerificationError(
          "Only fresh, non-revoked mandates can be recovered",
        );
      }

      await assertOwnerInstruction(connection, {
        signature: createSignature,
        owner: wallet,
        programId: env.FYAT_PROGRAM_ID,
        discriminator: CREATE_MANDATE_DISCRIMINATOR,
        account: mandatePda,
      });
    } catch (error) {
      if (
        error instanceof VerificationError ||
        error instanceof OnchainReadError
      ) {
        throw ApiErrors.validation([
          { path: "mandatePda", message: error.message },
        ]);
      }
      throw error;
    }

    try {
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
    } catch (error) {
      // Dua request paralel untuk PDA yang sama: yang kalah mendapat 400, bukan 500.
      if (isUniqueViolation(error)) {
        throw ApiErrors.validation([
          { path: "mandatePda", message: ALREADY_REGISTERED },
        ]);
      }
      throw error;
    }
  });
}