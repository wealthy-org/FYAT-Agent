import "server-only";

import { z } from "zod";

import type { ReceiptCursor } from "../models";
import { ApiErrors } from "./errors";

const cursorSchema = z.strictObject({
  // Persis 6 digit pecahan detik, sesuai keluaran `to_char ... US`.
  t: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/),
  id: z.uuid(),
});

export function encodeCursor(cursor: ReceiptCursor): string {
  const json = JSON.stringify({ t: cursor.createdAt, id: cursor.id });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor(raw: string): ReceiptCursor {
  const invalid = () =>
    ApiErrors.validation([{ path: "cursor", message: "Invalid cursor" }]);

  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }

  const parsed = cursorSchema.safeParse(data);
  if (!parsed.success) throw invalid();

  return { createdAt: parsed.data.t, id: parsed.data.id };
}