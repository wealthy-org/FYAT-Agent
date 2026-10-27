import { z } from "zod";

/** Bentuk Base58 untuk public key Solana. Validitas penuh dicek saat dipakai. */
const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const clientSchema = z.object({
  NEXT_PUBLIC_SOLANA_NETWORK: z.enum(["devnet", "localnet"]).default("devnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.url().default("https://api.devnet.solana.com"),
  NEXT_PUBLIC_TOKEN_MINT: z
    .string()
    .regex(BASE58_ADDRESS, "must be a Solana address")
    .optional(),
});

// Next.js hanya meng-inline NEXT_PUBLIC_* jika dirujuk secara eksplisit.
const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  // String kosong diperlakukan sebagai "tidak diset".
  NEXT_PUBLIC_TOKEN_MINT: process.env.NEXT_PUBLIC_TOKEN_MINT || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;