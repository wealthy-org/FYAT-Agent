import { NextResponse, type NextRequest } from "next/server";

import { ApiError, ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import {
  completeAgentJobBodySchema,
  mandateIdParamsSchema,
} from "@/server/api/schemas";
import { parseWith } from "@/server/api/request";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import { OnchainReadError } from "@/server/onchain/mandate-reader";
import {
  ExecutionVerificationError,
  verifyExecution,
} from "@/server/onchain/verify-execution";
import { findAgentJob, finishAgentJob } from "@/server/repositories/agent-jobs";
import {
  findReceiptBySignature,
  recordSuccess,
} from "@/server/repositories/receipts";
import { authorizeWorkerRequest } from "@/server/security/agent-job-token";
import { RATE_LIMITS } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleApi(req, RATE_LIMITS.mandateExecute, async () => {
    authorizeWorkerRequest(req.headers.get("authorization"));
    const { id } = parseWith(mandateIdParamsSchema, await context.params);
    const body = await req
      .json()
      .then((value: unknown) => parseWith(completeAgentJobBodySchema, value));
    const job = await findAgentJob({ id });
    if (!job) throw ApiErrors.notFound("Agent job not found.");
    if (job.status !== "PROCESSING") {
      if (job.status === body.status)
        return NextResponse.json({ status: job.status });
      throw new ApiError(
        409,
        "JOB_NOT_PROCESSING",
        "The agent job is no longer processing.",
      );
    }

    if (body.status === "SUCCEEDED") {
      if (!job.txSignature) {
        throw new ApiError(
          409,
          "JOB_SIGNATURE_MISSING",
          "The worker has not recorded a transaction signature.",
        );
      }

      const env = getServerEnv();
      let verified;
      try {
        verified = await verifyExecution(getConnection(), {
          signature: job.txSignature,
          programId: env.FYAT_PROGRAM_ID,
          mint: env.TOKEN_MINT,
          mandatePda: job.mandatePda,
          sessionPubkey: job.sessionPubkey,
          action: job.action,
          target: job.target,
          outputMint: env.SWAP_OUTPUT_MINT,
        });
      } catch (error) {
        if (
          error instanceof ExecutionVerificationError ||
          error instanceof OnchainReadError
        ) {
          throw ApiErrors.validation([
            { path: "txSignature", message: error.message },
          ]);
        }
        throw error;
      }
      if (verified.amount !== job.amount || verified.target !== job.target) {
        throw ApiErrors.validation([
          {
            path: "txSignature",
            message: "The confirmed transaction does not match the queued job.",
          },
        ]);
      }

      const receipt = await recordSuccess({
        mandateId: job.mandateId,
        amount: verified.amount,
        target: verified.target,
        txSignature: job.txSignature,
        onchainSpent: verified.onchainSpent,
      });
      if (!receipt) {
        const existing = await findReceiptBySignature({
          mandateId: job.mandateId,
          txSignature: job.txSignature,
        });
        if (!existing) {
          throw new ApiError(
            409,
            "EXECUTION_NOT_RECORDED",
            "The transaction is already recorded under another mandate.",
          );
        }
      }
    }

    await finishAgentJob({
      id,
      status: body.status,
      ...("error" in body ? { error: body.error } : {}),
    });
    return NextResponse.json({ status: body.status });
  });
}
