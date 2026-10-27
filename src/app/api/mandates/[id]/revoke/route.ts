import { NextResponse, type NextRequest } from "next/server";

import { ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import { parseWith } from "@/server/api/request";
import { emptyBodySchema, mandateIdParamsSchema } from "@/server/api/schemas";
import { serializeMandate } from "@/server/api/serializers";
import { readSignedJson } from "@/server/auth/signed-request";
import { revokeMandate } from "@/server/repositories/mandates";
import { RATE_LIMITS } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleApi(req, RATE_LIMITS.mandateRevoke, async () => {
    const { id } = parseWith(mandateIdParamsSchema, await context.params);
    const { wallet } = await readSignedJson(req, emptyBodySchema);

    // Pemeriksaan pemilik ada DI DALAM query SQL (Step 7).
    const mandate = await revokeMandate({
      mandateId: id,
      ownerPubkey: wallet,
    });

    // Satu pesan untuk semua kemungkinan, jadi tidak membuka celah enumerasi.
    if (!mandate) {
      throw ApiErrors.notFound(
        "Mandate not found, already revoked, or not owned by this wallet",
      );
    }

    return NextResponse.json({ mandate: serializeMandate(mandate) });
  });
}