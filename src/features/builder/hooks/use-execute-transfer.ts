"use client";

import { useState } from "react";

import type { ExecutionState } from "../flow";

export function useExecuteTransfer(
  execute: (amount: bigint) => Promise<string>,
) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<ExecutionState>({ kind: "idle" });

  async function run(amount: bigint) {
    setError("");
    setStatus("");
    setBusy(true);
    setOutcome({ kind: "running" });

    try {
      setStatus("Mengirim transaksi execute ke Solana...");
      const txSignature = await execute(amount);
      setStatus(`Transfer berhasil dikonfirmasi: ${txSignature}`);
      setOutcome({ kind: "success", signature: txSignature });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Eksekusi transfer gagal.";
      setError(message);
      setStatus("");
      setOutcome({ kind: "failed", message });
    } finally {
      setBusy(false);
    }
  }

  return { busy, status, error, outcome, run };
}
