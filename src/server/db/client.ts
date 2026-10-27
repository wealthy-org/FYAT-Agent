import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { getServerEnv } from "../env";

const UNIQUE_VIOLATION = "23505";

let sql: NeonQueryFunction<false, false> | undefined;

function getSql(): NeonQueryFunction<false, false> {
  sql ??= neon(getServerEnv().DATABASE_URL);
  return sql;
}

/**
 * Nilai yang boleh menjadi parameter. Uang dikirim sebagai string
 * (bigint.toString()), tidak pernah number, supaya tidak ada pembulatan.
 */
export type QueryParam = string | number | boolean | null;

/**
 * Satu-satunya pintu query. Teks SQL HARUS berupa konstanta;
 * nilai dari user selalu lewat `params` ($1, $2, ...).
 */
export async function query<Row>(
  text: string,
  params: readonly QueryParam[] = [],
): Promise<Row[]> {
  const rows = await getSql().query(text, [...params]);
  // Batas kepercayaan: bentuk Row dijamin oleh SQL di repository masing-masing.
  return rows as Row[];
}

export function firstRow<Row>(rows: readonly Row[]): Row | null {
  return rows[0] ?? null;
}

export function requireRow<Row>(rows: readonly Row[]): Row {
  const row = firstRow(rows);
  if (row === null) throw new Error("Expected a row but the query returned none");
  return row;
}

/** True bila error berasal dari pelanggaran UNIQUE (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === UNIQUE_VIOLATION
  );
}