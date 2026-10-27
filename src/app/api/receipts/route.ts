import { NextResponse, type NextRequest } from "next/server";

import { decodeCursor } from "@/server/api/cursor";
import { handleApi } from "@/server/api/handler";
import { parseWith } from "@/server/api/request";
import { receiptsQuerySchema } from "@/server/api/schemas";
import { RATE_LIMITS } from "@/server/security/rate-limit";
import { getReceiptPage } from "@/server/services/receipt-feed";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(req, RATE_LIMITS.receiptsRead, async () => {
    const { limit, cursor } = parseWith(
      receiptsQuerySchema,
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const page = await getReceiptPage({
      limit,
      after: cursor ? decodeCursor(cursor) : null,
    });

    return NextResponse.json(page);
  });
}