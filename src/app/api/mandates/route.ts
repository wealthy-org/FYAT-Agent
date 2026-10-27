import { NextResponse, type NextRequest } from "next/server";

import { handleApi } from "@/server/api/handler";
import { ApiErrors } from "@/server/api/errors";
import { createMandateBodySchema } from "@/server/api/schemas";
import { serializeMandate } from "@/server/api/serializers";
import { readSignedJson } from "@/server/auth/signed-request";
import { insertMandate } from "@/server/repositories/mandates";
import { findVaultByPda } from "@/server/repositories/vaults";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { deriveVaultAddress } from "@/server/solana/vault-address";

export const runtime = "nodejs";

const MS_PER_HOUR = 3_600_000;

export async function POST(req: NextRequest) {
  return handleApi(req, RATE_LIMITS.mandateWrite, async () => {
    const { wallet, body } = await readSignedJson(
      req,
      createMandateBodySchema,
    );
    const { sessionPubkey, config } = body;

    // Kunci agent tidak boleh sama dengan kunci owner.
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

    const mandate = await insertMandate({
      vaultId: vault.id,
      sessionPubkey,
      action: config.action,
      target: config.action === "SWAP" ? config.venue : config.recipient,
      maxPerAction: config.maxPerAction,
      maxTotal: config.maxTotal,
      // Kedaluwarsa dihitung dengan jam SERVER, bukan jam klien.
      expiresAt: new Date(Date.now() + config.expiresInHours * MS_PER_HOUR),
    });

    return NextResponse.json(
      { mandate: serializeMandate(mandate) },
      { status: 201 },
    );
  });
}