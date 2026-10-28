import { NextResponse, type NextRequest } from "next/server";

import { ApiError, ApiErrors } from "@/server/api/errors";
import { handleApi } from "@/server/api/handler";
import { parseWith } from "@/server/api/request";
import {
  mandateIdParamsSchema,
  recordExecutionBodySchema,
} from "@/server/api/schemas";
import { readSignedJson } from "@/server/auth/signed-request";
import { getServerEnv } from "@/server/env";
import type { Receipt } from "@/server/models";
import { getConnection } from "@/server/onchain/connection";
import { OnchainReadError } from "@/server/onchain/mandate-reader";
import {
  ExecutionVerificationError,
  verifyExecution,
} from "@/server/onchain/verify-execution";
import { findExecutionRef } from "@/server/repositories/mandates";
import {
  findReceiptBySignature,
  recordSuccess,
} from "@/server/repositories/receipts";
import { RATE_LIMITS } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const NOT_FOUND = "Mandate not found or not owned by this wallet";

function toReceiptResponse(receipt: Receipt) {
  return {
    id: receipt.id,
    mandateId: receipt.mandateId,
    action: receipt.action,
    amount: receipt.amount.toString(),
    target: receipt.target,
    txSignature: receipt.txSignature,
    status: receipt.status,
    createdAt: receipt.createdAt.toISOString(),
  };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleApi(req, RATE_LIMITS.mandateExecute, async () => {
    const { id } = parseWith(mandateIdParamsSchema, await context.params);
    const { wallet, body } = await readSignedJson(
      req,
      recordExecutionBodySchema,
    );

    const ref = await findExecutionRef({ mandateId: id, ownerPubkey: wallet });
    if (!ref) throw ApiErrors.notFound(NOT_FOUND);

    if (!ref.mandatePda) {
      throw ApiErrors.validation([
        { path: "id", message: "This mandate is not registered onchain" },
      ]);
    }

    if (ref.action !== "TRANSFER") {
      throw ApiErrors.validation([
        {
          path: "id",
          message: "Only TRANSFER mandates support onchain execution",
        },
      ]);
    }

    const env = getServerEnv();

    let verified: Awaited<ReturnType<typeof verifyExecution>>;
    try {
      verified = await verifyExecution(getConnection(), {
        signature: body.txSignature,
        programId: env.FYAT_PROGRAM_ID,
        mint: env.TOKEN_MINT,
        mandatePda: ref.mandatePda,
        sessionPubkey: ref.sessionPubkey,
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

    // Penerima di chain harus sama dengan target mandate yang terdaftar di database.
    if (verified.target !== ref.target) {
      throw ApiErrors.validation([
        {
          path: "txSignature",
          message: "Transaction recipient does not match the mandate target",
        },
      ]);
    }

    const receipt = await recordSuccess({
      mandateId: id,
      amount: verified.amount,
      target: verified.target,
      txSignature: body.txSignature,
      onchainSpent: verified.onchainSpent,
    });

    if (receipt) {
      return NextResponse.json(
        { receipt: toReceiptResponse(receipt) },
        { status: 201 },
      );
    }

    // Signature yang sama dicatat ulang (mis. klien mengulang setelah jaringan putus):
    // idempoten, kembalikan receipt yang sudah ada.
    const existing = await findReceiptBySignature({
      mandateId: id,
      txSignature: body.txSignature,
    });
    if (existing) {
      return NextResponse.json({ receipt: toReceiptResponse(existing) });
    }

    // Satu signature hanya boleh menjadi satu receipt. Transaksi yang memuat eksekusi
    // untuk dua mandate berbeda hanya bisa dicatat di salah satunya.
    throw new ApiError(
      409,
      "EXECUTION_NOT_RECORDED",
      "This transaction signature is already recorded under another mandate",
    );
  });
}