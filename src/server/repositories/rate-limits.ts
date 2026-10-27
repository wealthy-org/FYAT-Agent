import "server-only";

import { query, requireRow } from "../db/client";

/** Mencatat satu hit pada window saat ini dan mengembalikan total hit-nya. */
export async function registerHit(
  bucket: string,
  windowSeconds: number,
): Promise<number> {
  const rows = await query<{ hits: number }>(
    `INSERT INTO rate_limit_hits AS r (bucket, window_start)
     VALUES (
       $1,
       to_timestamp(floor(extract(epoch FROM now()) / $2::int) * $2::int)
     )
     ON CONFLICT (bucket, window_start)
     DO UPDATE SET hits = r.hits + 1
     RETURNING hits`,
    [bucket, windowSeconds],
  );

  return requireRow(rows).hits;
}