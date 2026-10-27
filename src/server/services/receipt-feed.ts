import "server-only";

import { RECEIPTS_PAGE_SIZE } from "@/features/receipts/constants";
import type { ReceiptPageDto } from "@/features/receipts/types";

import { encodeCursor } from "../api/cursor";
import { serializeReceipt } from "../api/serializers";
import type { ReceiptCursor } from "../models";
import { listReceiptsPage } from "../repositories/receipts";

/** Dipakai oleh route API dan Server Component, jadi bentuk datanya selalu sama. */
export async function getReceiptPage(
  options: { limit?: number; after?: ReceiptCursor | null } = {},
): Promise<ReceiptPageDto> {
  const page = await listReceiptsPage(options);

  return {
    items: page.items.map(serializeReceipt),
    nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
  };
}

/** Untuk render awal halaman. Gagal dengan lembut: null berarti "tidak tersedia". */
export async function getInitialReceipts(): Promise<ReceiptPageDto | null> {
  try {
    return await getReceiptPage({ limit: RECEIPTS_PAGE_SIZE });
  } catch (error) {
    console.error("[receipts] initial load failed", error);
    return null;
  }
}