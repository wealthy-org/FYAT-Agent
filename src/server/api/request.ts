import "server-only";

import type { NextRequest } from "next/server";
import type { z } from "zod";

import { ApiErrors, type ApiIssue } from "./errors";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_ISSUES = 10;

/** Membaca body mentah dengan batas ukuran. String ini juga yang di-hash untuk signature. */
export async function readRawBody(req: NextRequest): Promise<string> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw ApiErrors.unsupportedMediaType();
  }

  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw ApiErrors.payloadTooLarge();
  }

  // Content-Length bisa dipalsukan atau tidak ada, jadi ukur lagi setelah dibaca.
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    throw ApiErrors.payloadTooLarge();
  }

  return raw;
}

/** Validasi data apa pun dengan zod. Error-nya aman dikirim ke klien. */
export function parseWith<S extends z.ZodType>(
  schema: S,
  data: unknown,
): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const issues: ApiIssue[] = result.error.issues
    .slice(0, MAX_ISSUES)
    .map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    }));

  throw ApiErrors.validation(issues);
}

export function parseJson<S extends z.ZodType>(
  raw: string,
  schema: S,
): z.output<S> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw ApiErrors.invalidJson();
  }

  return parseWith(schema, data);
}