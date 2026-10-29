import "server-only";

import { query } from "../db/client";

/** Membuang nonce kedaluwarsa dan counter rate limit lama. */
export async function pruneSecurityTables(): Promise<void> {
  await query("DELETE FROM auth_nonces WHERE expires_at < now()");
  await query(
    "DELETE FROM rate_limit_hits WHERE window_start < now() - interval '1 day'",
  );
  await query(
    "DELETE FROM faucet_claims WHERE claimed_at < now() - interval '1 day'",
  );
}
