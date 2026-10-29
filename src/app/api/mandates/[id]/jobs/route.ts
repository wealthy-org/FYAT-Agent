import { NextResponse, type NextRequest } from "next/server";

import { ApiError, ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import {
  createAgentJobBodySchema,
  mandateIdParamsSchema,
} from "@/server/api/schemas";
import { parseWith } from "@/server/api/request";
import { readSignedJson } from "@/server/auth/signed-request";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import { OnchainReadError, readMandate } from "@/server/onchain/mandate-reader";
import { insertAgentJob } from "@/server/repositories/agent-jobs";
import { findExecutionRef } from "@/server/repositories/mandates";
import {
  createAgentJobToken,
  hashAgentJobToken,
} from "@/server/security/agent-job-token";
import { RATE_LIMITS } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleApi(req, RATE_LIMITS.mandateExecute, async () => {
    const { id } = parseWith(mandateIdParamsSchema, await context.params);
    const { wallet, body } = await readSignedJson(
      req,
      createAgentJobBodySchema,
    );
    const env = getServerEnv();
    if (!env.AGENT_SESSION_PUBKEY || !env.WORKER_API_SECRET) {
      throw new ApiError(
        503,
        "AGENT_WORKER_UNAVAILABLE",
        "The Railway agent worker is not configured.",
      );
    }

    const ref = await findExecutionRef({ mandateId: id, ownerPubkey: wallet });
    if (!ref?.mandatePda)
      throw ApiErrors.notFound("Registered on-chain mandate not found.");
    if (ref.sessionPubkey !== env.AGENT_SESSION_PUBKEY) {
      throw ApiErrors.validation([
        {
          path: "id",
          message:
            "This mandate is not assigned to the configured agent worker.",
        },
      ]);
    }

    const amount = BigInt(body.amount);
    let mandate;
    try {
      mandate = await readMandate(getConnection(), {
        mandatePda: ref.mandatePda,
        programId: env.FYAT_PROGRAM_ID,
      });
    } catch (error) {
      if (error instanceof OnchainReadError) {
        throw ApiErrors.validation([{ path: "id", message: error.message }]);
      }
      throw error;
    }

    if (
      mandate.session !== env.AGENT_SESSION_PUBKEY ||
      mandate.action !== ref.action ||
      mandate.recipient !== ref.target
    ) {
      throw ApiErrors.validation([
        {
          path: "id",
          message:
            "On-chain mandate details do not match the registered mandate.",
        },
      ]);
    }
    if (mandate.revokedAt !== 0n) {
      throw ApiErrors.validation([
        { path: "id", message: "The mandate has been revoked." },
      ]);
    }
    if (mandate.expiresAt <= BigInt(Math.floor(Date.now() / 1000))) {
      throw ApiErrors.validation([
        { path: "id", message: "The mandate has expired." },
      ]);
    }
    if (
      amount > mandate.maxPerAction ||
      mandate.spent + amount > mandate.maxTotal
    ) {
      throw ApiErrors.validation([
        {
          path: "amount",
          message: "The amount exceeds the mandate's on-chain limits.",
        },
      ]);
    }
    if (
      ref.action === "SWAP" &&
      (!env.DAMM_POOL || !env.SWAP_OUTPUT_MINT || env.DAMM_POOL !== ref.target)
    ) {
      throw ApiErrors.validation([
        {
          path: "id",
          message: "The approved DAMM pool or output mint is not configured.",
        },
      ]);
    }

    const token = createAgentJobToken(wallet, id, body.requestId);
    const result = await insertAgentJob({
      mandateId: id,
      requestId: body.requestId,
      amount,
      tokenHash: hashAgentJobToken(token),
    });
    if (result.job.amount !== amount) {
      throw new ApiError(
        409,
        "JOB_REQUEST_CONFLICT",
        "This request ID was already used with a different amount.",
      );
    }
    if (result.tokenHash !== hashAgentJobToken(token)) {
      throw new ApiError(
        409,
        "JOB_TOKEN_ROTATED",
        "This request was already queued before the worker secret changed.",
      );
    }

    return NextResponse.json(
      { jobId: result.job.id, token, status: result.job.status },
      { status: result.job.status === "QUEUED" ? 202 : 200 },
    );
  });
}
