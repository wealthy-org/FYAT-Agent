"use client";

import { useState } from "react";

export function useExecuteTransfer(
  execute: (amount: bigint) => Promise<string>,
) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function run(amount: bigint) {
    setError("");
    setStatus("");
    setBusy(true);

    try {
      setStatus("Mengirim transaksi execute ke Solana...");
      const txSignature = await execute(amount);
      setStatus(`Transfer berhasil dikonfirmasi: ${txSignature}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Eksekusi transfer gagal.",
      );
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return { busy, status, error, run };
}
