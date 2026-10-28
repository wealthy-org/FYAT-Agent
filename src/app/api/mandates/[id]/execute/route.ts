import { NextResponse, type NextRequest } from "next/server";

import { ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import { parseWith } from "@/server/api/request";
import {
  mandateIdParamsSchema,
  recordExecutionBodySchema,
} from "@/server/api/schemas";
import { readSignedJson } from "@/server/auth/signed-request";
import { getServerEnv } from "@/server/env";
import { getConnection } from "@/server/onchain/connection";
import { OnchainReadError } from "@/server/onchain/mandate-reader";
import { ExecutionVerificationError, verifyExecution } from "@/server/onchain/verify-execution";
import { findOnchainRef } from "@/server/repositories/mandates";
import {
  recordRejection,
  recordSuccess,
} from "@/server/repositories/receipts";
import { RATE_LIMITS } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleApi(req, RATE_LIMITS.mandateWrite, async () => {
    const { id } = parseWith(
      mandateIdParamsSchema,
      await context.params,
    );

    const { wallet, body } = await readSignedJson(
      req,
      recordExecutionBodySchema,
    );

    const ref = await findOnchainRef({
      mandateId: id,
      ownerPubkey: wallet,
    });

    if (!ref) {
      throw ApiErrors.notFound("Mandate not found");
    }

    if (!ref.mandatePda) {
      throw ApiErrors.validation([
        {
          path: "id",
          message: "Mandate is not registered onchain",
        },
      ]);
    }

    const env = getServerEnv();

    let verified;

    try {
      verified = await verifyExecution(getConnection(), {
        signature: body.txSignature,
        programId: env.FYAT_PROGRAM_ID,
        mint: env.TOKEN_MINT,
        mandatePda: ref.mandatePda,
      });
    } catch (error) {
      if (
        error instanceof ExecutionVerificationError ||
        error instanceof OnchainReadError
      ) {
        throw ApiErrors.validation([
          {
            path: "txSignature",
            message: error.message,
          },
        ]);
      }

      throw error;
    }

    const receipt = await recordSuccess({
      mandateId: id,
      amount: verified.amount,
      target: verified.target,
      txSignature: body.txSignature,
    });

    if (!receipt) {
      await recordRejection({
        mandateId: id,
        action: "TRANSFER",
        amount: verified.amount,
        target: verified.target,
        status: "REJECTED_BY_POLICY",
        reason: "Mandate policy rejected the execution",
      });

      throw ApiErrors.validation([
        {
          path: "txSignature",
          message: "Mandate policy rejected this execution",
        },
      ]);
    }

    return NextResponse.json(
      { receipt: { ...receipt, amount: receipt.amount.toString(),
        createdAt: receipt.createdAt.toISOString() } },
      { status: 201 },
    );
  });
}