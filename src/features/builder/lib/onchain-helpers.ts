import type { Connection } from "@solana/web3.js";

/** Pesan error yang ramah dari error Anchor/wallet. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/User rejected|rejected the request/i.test(error.message)) {
      return "Transaksi dibatalkan di wallet.";
    }
    return error.message;
  }
  return "Terjadi kesalahan tak dikenal.";
}

/** Menunggu `confirmed` dan melempar error bila transaksi gagal onchain. */
export async function confirmOrThrow(
  connection: Connection,
  signature: string,
  failureMessage: string,
): Promise<void> {
  const result = await connection.confirmTransaction(signature, "confirmed");
  if (result.value.err) throw new Error(failureMessage);
}