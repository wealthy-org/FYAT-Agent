import { env } from "./env";

export type SwapConfig = {
  /** Pool DAMM v2 yang disetujui untuk mandate swap. */
  pool: string;
  inputMint: string;
  outputMint: string;
};

/**
 * null = swap belum dikonfigurasi di lingkungan ini. Gagal tertutup: konfigurasi
 * yang setengah jadi (atau input sama dengan output) dianggap tidak ada.
 */
export function getSwapConfig(): SwapConfig | null {
  const pool = env.NEXT_PUBLIC_DAMM_POOL;
  const inputMint = env.NEXT_PUBLIC_TOKEN_MINT;
  const outputMint = env.NEXT_PUBLIC_SWAP_OUTPUT_MINT;

  if (!pool || !inputMint || !outputMint) return null;
  if (inputMint === outputMint) return null;

  return { pool, inputMint, outputMint };
}