import "server-only";

import { z } from "zod";

import { mandateConfigSchema } from "@/features/builder/shared";
import { isValidSolanaAddress } from "@/lib/solana";

/** Format Base58 signature transaksi (64 byte → 86-88 karakter), sama dengan domain DB. */
const SIGNATURE_RE = /^[1-9A-HJ-NP-Za-km-z]{86,88}$/;
const solanaSignatureSchema = z
  .string()
  .trim()
  .regex(SIGNATURE_RE, "Enter a valid transaction signature");

const solanaAddressSchema = z
  .string()
  .trim()
  .refine(isValidSolanaAddress, "Enter a valid Solana address");

/** Dipakai endpoint yang memang tanpa payload. */
export const emptyBodySchema = z.strictObject({});

export const mandateIdParamsSchema = z.strictObject({ id: z.uuid() });

/**
 * Create: owner sudah menandatangani dan mengirim transaksi di Phantom.
 * Klien hanya melaporkan PDA dan signature. Server membaca akun dari chain
 * dan mencocokkan owner, session, recipient, serta cap sebelum INSERT.
 * `config` dipakai untuk membandingkan dengan isi akun onchain, bukan dipercaya.
 */
export const createMandateBodySchema = z.strictObject({
  sessionPubkey: solanaAddressSchema,
  config: mandateConfigSchema,
  mandatePda: solanaAddressSchema,
  createSignature: solanaSignatureSchema,
});

export const recoverMandateBodySchema = z.strictObject({
  mandatePda: solanaAddressSchema,
  createSignature: solanaSignatureSchema,
});

/** Revoke: owner menandatangani di Phantom, klien melaporkan signature-nya. */
export const revokeMandateBodySchema = z.strictObject({
  revokeSignature: solanaSignatureSchema,
});

/**
 * Receipt dari eksekusi agent: key agent ada di browser, jadi klien
 * melaporkan signature, dan server memverifikasinya di chain.
 */
export const recordExecutionBodySchema = z.strictObject({
  txSignature: solanaSignatureSchema,
});

export const createAgentJobBodySchema = z.strictObject({
  requestId: z.uuid(),
  amount: z
    .string()
    .regex(/^[1-9]\d{0,19}$/, "Enter a positive base-unit amount"),
});

export const completeAgentJobBodySchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("SUCCEEDED") }),
  z.strictObject({
    status: z.literal("FAILED"),
    error: z.string().trim().min(1).max(280),
  }),
  z.strictObject({
    status: z.literal("UNKNOWN"),
    error: z.string().trim().min(1).max(280),
  }),
]);

/** GET bersifat longgar: parameter tak dikenal diabaikan, bukan ditolak. */
export const receiptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});

/** GET bersifat longgar: parameter tak dikenal diabaikan. */
export const mandatesListQuerySchema = z.object({
  owner: z
    .string()
    .trim()
    .refine(isValidSolanaAddress, "Enter a valid Solana address"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
