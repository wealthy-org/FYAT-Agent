/** Driver bisa mengembalikan Date atau string ISO. Normalisasi ke Date. */
export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** NUMERIC(20,0) datang sebagai string. Jangan pernah lewat Number(). */
export function toBigInt(value: string): bigint {
  return BigInt(value);
}