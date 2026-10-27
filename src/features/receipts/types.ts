import { z } from "zod";

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BASE58_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{86,88}$/;

export const receiptSchema = z.object({
  id: z.uuid(),
  sessionPubkey: z.string().regex(BASE58_ADDRESS),
  action: z.enum(["SWAP", "TRANSFER"]),
  /** Base unit sebagai string desimal, karena JSON tidak mengenal bigint. */
  amount: z.string().regex(/^\d{1,20}$/),
  status: z.enum(["SUCCESS", "REJECTED_BY_POLICY", "FAILED_SIMULATION"]),
  reason: z.string().max(280).nullable(),
  txSignature: z.string().regex(BASE58_SIGNATURE).nullable(),
  createdAt: z.iso.datetime(),
});

export const receiptPageSchema = z.object({
  items: z.array(receiptSchema).max(50),
  /** Opaque bagi klien: kembalikan apa adanya untuk halaman berikutnya. */
  nextCursor: z.string().max(200).nullable(),
});

export type ReceiptDto = z.infer<typeof receiptSchema>;
export type ReceiptPageDto = z.infer<typeof receiptPageSchema>;