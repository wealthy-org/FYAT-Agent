import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");
/** Konstanta arbitrer untuk pg_advisory_lock. */
const LOCK_ID = 727_274;

type AppliedRow = { name: string; checksum: string };

/** CRLF → LF supaya checksum sama di Windows, macOS, dan CI. */
function normalize(sql: string): string {
  return sql.replace(/\r\n/g, "\n");
}

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

async function run(): Promise<void> {
  const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set DATABASE_MIGRATION_URL (or DATABASE_URL) in .env.local");
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        TEXT PRIMARY KEY,
        checksum    TEXT NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<AppliedRow>(
      "SELECT name, checksum FROM schema_migrations",
    );
    const applied = new Map(rows.map((row) => [row.name, row.checksum]));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      const sql = normalize(
        await readFile(path.join(MIGRATIONS_DIR, file), "utf8"),
      );
      const hash = checksum(sql);
      const previous = applied.get(file);

      if (previous !== undefined) {
        if (previous !== hash) {
          throw new Error(
            `Migration ${file} was modified after being applied. Create a new migration instead.`,
          );
        }
        continue;
      }

      console.log(`→ applying ${file}`);

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          [file, hash],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }

      appliedCount += 1;
    }

    console.log(
      appliedCount === 0
        ? "Database is up to date."
        : `Applied ${appliedCount} migration(s).`,
    );
  } finally {
    await client.end(); // melepas advisory lock sekaligus
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});