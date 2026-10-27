import "server-only";

import { query } from "../db/client";

/**
 * Mencatat nonce. Hasil false = nonce sudah pernah dipakai (replay).
 * INSERT ... ON CONFLICT bersifat atomik, jadi dua request dengan nonce
 * yang sama tidak mungkin keduanya berhasil.
 */
export async function consumeNonce(input: {
  nonce: string;
  wallet: string;
  expiresAt: Date;
}): Promise<boolean> {
  const rows = await query<{ nonce: string }>(
    `INSERT INTO auth_nonces (nonce, wallet, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (nonce) DO NOTHING
     RETURNING nonce`,
    [input.nonce, input.wallet, input.expiresAt.toISOString()],
  );

  return rows.length === 1;
}