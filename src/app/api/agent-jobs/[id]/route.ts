import { NextResponse, type NextRequest } from "next/server";

import { ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import { mandateIdParamsSchema } from "@/server/api/schemas";
import { parseWith } from "@/server/api/request";
import { findAgentJobByTokenHash } from "@/server/repositories/agent-jobs";
import { isAgentJobTokenValid } from "@/server/security/agent-job-token";
import { RATE_LIMITS } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleApi(req, RATE_LIMITS.mandateExecute, async () => {
    const { id } = parseWith(mandateIdParamsSchema, await context.params);
    const token = /^Bearer ([\da-f]{64})$/i.exec(
      req.headers.get("authorization") ?? "",
    )?.[1];
    if (!token) throw ApiErrors.unauthenticated("Invalid job credentials");

    const job = await findAgentJobByTokenHash({ id });
    if (!job || !isAgentJobTokenValid(token, job.tokenHash)) {
      throw ApiErrors.notFound("Agent job not found.");
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        amount: job.amount.toString(),
        txSignature: job.txSignature,
        error: job.error,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        finishedAt: job.finishedAt?.toISOString() ?? null,
      },
    });
  });
}
