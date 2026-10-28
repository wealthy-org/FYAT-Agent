import { NextResponse, type NextRequest } from "next/server";

import { ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import { parseWith } from "@/server/api/request";
import {
  mandateIdParamsSchema,
  revokeMandateBodySchema,
} from "@/server/api/schemas";
import { serializeMandate } from "@/server/api/serializers";
import { readSignedJson } from "@/server/auth/signed-request";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import { OnchainReadError } from "@/server/onchain/mandate-reader";
import { VerificationError } from "@/server/onchain/verify-create";
import { verifyRevoke } from "@/server/onchain/verify-revoke";
import {
  findOnchainRef,
  revokeMandateOnchain,
} from "@/server/repositories/mandates";
import { RATE_LIMITS } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const NOT_FOUND =
  "Mandate not found, already revoked, or not owned by this wallet";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleApi(req, RATE_LIMITS.mandateRevoke, async () => {
    const { id } = parseWith(mandateIdParamsSchema, await context.params);
    const { wallet, body } = await readSignedJson(req, revokeMandateBodySchema);

    // Pemilik dicek di SQL; satu pesan untuk semua kasus agar tidak bisa dienumerasi.
    const ref = await findOnchainRef({ mandateId: id, ownerPubkey: wallet });
    if (!ref) throw ApiErrors.notFound(NOT_FOUND);
    if (!ref.mandatePda) {
      throw ApiErrors.validation([
        { path: "id", message: "This mandate is not registered onchain" },
      ]);
    }

    const env = getServerEnv();

    let verified;
    try {
      verified = await verifyRevoke(getConnection(), {
        ownerWallet: wallet,
        mint: env.TOKEN_MINT,
        programId: env.FYAT_PROGRAM_ID,
        mandatePda: ref.mandatePda,
        revokeSignature: body.revokeSignature,
      });
    } catch (error) {
      if (
        error instanceof VerificationError ||
        error instanceof OnchainReadError
      ) {
        throw ApiErrors.validation([
          { path: "revokeSignature", message: error.message },
        ]);
      }
      throw error;
    }

    const mandate = await revokeMandateOnchain({
      mandateId: id,
      ownerPubkey: wallet,
      revokedAt: new Date(Number(verified.revokedAt) * 1000),
      revokeSignature: body.revokeSignature,
    });
    if (!mandate) throw ApiErrors.notFound(NOT_FOUND);

    return NextResponse.json({ mandate: serializeMandate(mandate) });
  });
}