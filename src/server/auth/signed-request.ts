import "server-only";

import type { NextRequest } from "next/server";
import type { z } from "zod";

import { parseJson, readRawBody } from "../api/request";
import { authenticateRequest } from "./authenticate";

/**
 * Pintu masuk standar untuk endpoint mutasi:
 * body dibaca → identitas dibuktikan → baru body divalidasi.
 * Pemanggil tanpa signature valid tidak pernah sampai ke validasi.
 */
export async function readSignedJson<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): Promise<{ wallet: string; body: z.output<S> }> {
  const raw = await readRawBody(req);
  const wallet = await authenticateRequest(req, raw);

  return { wallet, body: parseJson(raw, schema) };
}