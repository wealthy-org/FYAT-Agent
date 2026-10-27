import "server-only";

import { z } from "zod";

import { mandateConfigSchema } from "@/features/builder/shared";
import { isValidSolanaAddress } from "@/lib/solana";

/** Body kosong: identitas sudah dibawa tanda tangan, tidak ada payload. */
export const emptyBodySchema = z.strictObject({});

export const mandateIdParamsSchema = z.strictObject({ id: z.uuid() });

/**
 * `config` memakai schema yang SAMA dengan form di browser (Step 6a),
 * jadi aturan klien dan server tidak mungkin berbeda.
 * vaultPda tidak ada di sini: server menurunkannya dari wallet penanda tangan.
 */
export const createMandateBodySchema = z.strictObject({
  sessionPubkey: z
    .string()
    .trim()
    .refine(isValidSolanaAddress, "Enter a valid Solana address"),
  config: mandateConfigSchema,
});

/** GET bersifat longgar: parameter tak dikenal diabaikan, bukan ditolak. */
export const receiptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});