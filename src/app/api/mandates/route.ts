import { NextResponse, type NextRequest } from "next/server";

import { handleApi } from "@/server/api/handler";
import { ApiErrors } from "@/server/api/errors";
import { createMandateBodySchema } from "@/server/api/schemas";
import { serializeMandate } from "@/server/api/serializers";
import { readSignedJson } from "@/server/auth/signed-request";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import { OnchainReadError } from "@/server/onchain/mandate-reader";
import {
  VerificationError,
  verifyCreate,
} from "@/server/onchain/verify-create";
import { findMandateByPda, insertMandate } from "@/server/repositories/mandates";
import { findVaultByPda } from "@/server/repositories/vaults";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { deriveVaultAddress } from "@/server/solana/vault-address";
import { parseWith } from "@/server/api/request";
import { mandatesListQuerySchema } from "@/server/api/schemas";
import { inspectOwnerMandates } from "@/server/services/mandate-inspector";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(req, RATE_LIMITS.mandatesRead, async () => {
    const { owner, limit } = parseWith(
      mandatesListQuerySchema,
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const mandates = await inspectOwnerMandates(owner, limit);
    return NextResponse.json({ mandates });
  });
}

export async function POST(req: NextRequest) {
  return handleApi(req, RATE_LIMITS.mandateWrite, async () => {
    const { wallet, body } = await readSignedJson(
      req,
      createMandateBodySchema,
    );
    const { sessionPubkey, config, mandatePda, createSignature } = body;

    if (sessionPubkey === wallet) {
      throw ApiErrors.validation([
        {
          path: "sessionPubkey",
          message: "The session key must differ from the owner wallet",
        },
      ]);
    }

    // Vault diturunkan dari wallet yang TERBUKTI, bukan dari input klien.
    const vault = await findVaultByPda(deriveVaultAddress(wallet));
    if (!vault || vault.ownerPubkey !== wallet) {
      throw ApiErrors.notFound("Vault not found. Register your vault first.");
    }

    if (await findMandateByPda(mandatePda)) {
      throw ApiErrors.validation([
        { path: "mandatePda", message: "This mandate is already registered" },
      ]);
    }

    const env = getServerEnv();
    let target: string;
    if (config.action === "TRANSFER") {
      target = config.recipient;
    } else {
      if (config.venue !== "METEORA_DAMM") {
        throw ApiErrors.validation([
          { path: "config.venue", message: "Unsupported swap venue" },
        ]);
      }
      if (!env.DAMM_POOL || !env.SWAP_OUTPUT_MINT) {
        throw ApiErrors.validation([
          {
            path: "config.venue",
            message: "The approved DAMM pool and output mint are not configured",
          },
        ]);
      }
      target = env.DAMM_POOL;
    }

    // Chain adalah sumber kebenaran: klien hanya melaporkan, server memverifikasi.
    let verified;
    try {
      verified = await verifyCreate(getConnection(), {
        ownerWallet: wallet,
        mint: env.TOKEN_MINT,
        programId: env.FYAT_PROGRAM_ID,
        mandatePda,
        createSignature,
        sessionPubkey,
        config:
          config.action === "TRANSFER"
            ? {
                action: config.action,
                target,
                maxPerAction: config.maxPerAction,
                maxTotal: config.maxTotal,
                expiresInHours: config.expiresInHours,
              }
            : {
                action: config.action,
                target,
                venue: config.venue,
                outputMint: env.SWAP_OUTPUT_MINT!,
                maxPerAction: config.maxPerAction,
                maxTotal: config.maxTotal,
                expiresInHours: config.expiresInHours,
              },
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

    // Vault di DB harus sama dengan vault yang diverifikasi di chain.
    if (verified.vaultPda !== vault.vaultPda) {
      throw ApiErrors.validation([
        { path: "mandatePda", message: "Mandate does not belong to your vault" },
      ]);
    }

    const { onchain } = verified;
    const mandate = await insertMandate({
      vaultId: vault.id,
      sessionPubkey: onchain.session,
      action: onchain.action,
      target: onchain.recipient,
      maxPerAction: onchain.maxPerAction,
      maxTotal: onchain.maxTotal,
      // Semua nilai waktu dan batas dari chain, bukan dari klien atau jam server.
      expiresAt: new Date(Number(onchain.expiresAt) * 1000),
      createdAt: new Date(Number(onchain.createdAt) * 1000),
      onchain: {
        mandatePda: onchain.pda,
        onchainId: onchain.id,
        createSignature,
      },
    });

    return NextResponse.json(
      { mandate: serializeMandate(mandate) },
      { status: 201 },
    );
  });
}