import type { PublicKey } from "@solana/web3.js";

import type { AgentAttempt, MandateConfig } from "../types";

export type SimulationRequest = {
  config: MandateConfig;
  attempt: AgentAttempt;
  /** Wallet yang terhubung. Hanya public key, tanpa kunci rahasia. */
  payer: PublicKey;
};

export type SimulationFailureCode =
  | "MINT_NOT_FOUND"
  | "NO_TOKEN_ACCOUNT"
  | "INSUFFICIENT_TOKEN_BALANCE"
  | "INSUFFICIENT_SOL"
  | "REJECTED";

/**
 * PASSED       : jaringan menyatakan transaksi akan berhasil.
 * FAILED       : jaringan menolak (jawaban sah, bukan error aplikasi).
 * UNSUPPORTED  : simulasi tidak bisa dijalankan untuk kasus ini (swap, belum dikonfigurasi).
 * ERROR        : gagal menghubungi RPC (timeout, jaringan, rate limit).
 */
export type SimulationOutcome =
  | { kind: "PASSED"; unitsConsumed: number | null; logs: readonly string[] }
  | {
      kind: "FAILED";
      code: SimulationFailureCode;
      message: string;
      logs: readonly string[];
    }
  | { kind: "UNSUPPORTED"; message: string }
  | { kind: "ERROR"; message: string };

export type SimulationState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; outcome: SimulationOutcome };