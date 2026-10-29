import { RECEIPTS_PAGE_SIZE } from "./constants";
import { receiptPageSchema, type ReceiptPageDto } from "./types";

/** Respons divalidasi ulang: UI tidak merender apa pun yang bentuknya tidak dikenal. */
export async function fetchReceiptPage(
  cursor: string | null,
  signal: AbortSignal,
): Promise<ReceiptPageDto> {
  const params = new URLSearchParams({ limit: String(RECEIPTS_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/api/receipts?${params}`, {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return receiptPageSchema.parse(await response.json());
}
