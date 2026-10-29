import { z } from "zod";

/** Bentuk Base58 untuk public key Solana. Validitas penuh dicek saat dipakai. */
const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const optionalAddress = z
  .string()
  .regex(BASE58_ADDRESS, "must be a Solana address")
  .optional();

const clientSchema = z.object({
  NEXT_PUBLIC_SOLANA_NETWORK: z.enum(["devnet", "localnet"]).default("devnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.url().default("https://api.devnet.solana.com"),
  NEXT_PUBLIC_TOKEN_MINT: optionalAddress,
  /** Pool Meteora DAMM v2 yang disetujui untuk mandate swap. */
  NEXT_PUBLIC_DAMM_POOL: optionalAddress,
  /** Token output swap (pasangan dari TOKEN_MINT di pool itu). */
  NEXT_PUBLIC_SWAP_OUTPUT_MINT: optionalAddress,
});

// Next.js hanya meng-inline NEXT_PUBLIC_* jika dirujuk secara eksplisit.
// String kosong diperlakukan sebagai "tidak diset".
const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  NEXT_PUBLIC_TOKEN_MINT: process.env.NEXT_PUBLIC_TOKEN_MINT || undefined,
  NEXT_PUBLIC_DAMM_POOL: process.env.NEXT_PUBLIC_DAMM_POOL || undefined,
  NEXT_PUBLIC_SWAP_OUTPUT_MINT:
    process.env.NEXT_PUBLIC_SWAP_OUTPUT_MINT || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;