import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import {
  enforceRateLimit,
  type RateLimitRule,
} from "../security/rate-limit";
import { ApiError } from "./errors";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.issues && { issues: error.issues }),
        },
      },
      { status: error.status, headers: { ...NO_STORE, ...error.headers } },
    );
  }

  // Error tak terduga: detail HANYA masuk log server, klien cuma menerima requestId.
  const requestId = crypto.randomUUID();
  console.error(`[api] ${requestId}`, error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong",
        requestId,
      },
    },
    { status: 500, headers: NO_STORE },
  );
}

/** Pembungkus semua route: rate limit → logika route → error handling seragam. */
export async function handleApi(
  req: NextRequest,
  rule: RateLimitRule,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    await enforceRateLimit(req, rule);

    const response = await run();
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}