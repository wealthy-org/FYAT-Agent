import "server-only";

import { query, requireRow } from "../db/client";

export async function registerFaucetClaim(
  wallet: string,
  windowSeconds: number,
): Promise<number | null> {
  const claimed = await query<{ claimed_at: Date }>(
    `INSERT INTO faucet_claims (wallet, claimed_at)
     VALUES ($1, now())
     ON CONFLICT (wallet)
     DO UPDATE SET claimed_at = now()
     WHERE faucet_claims.claimed_at <=
       now() - ($2::int * interval '1 second')
     RETURNING claimed_at`,
    [wallet, windowSeconds],
  );
  if (claimed.length > 0) return null;

  const rows = await query<{ retry_after: number }>(
    `SELECT GREATEST(
       1,
       ceil(extract(epoch FROM
         claimed_at + ($2::int * interval '1 second') - now()
       ))
     )::int AS retry_after
     FROM faucet_claims
     WHERE wallet = $1`,
    [wallet, windowSeconds],
  );

  return requireRow(rows).retry_after;
}
