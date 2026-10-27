"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useRef, useState } from "react";

import { runSimulation } from "../simulation/simulate";
import type { SimulationState } from "../simulation/types";
import type { AgentAttempt, MandateConfig } from "../types";

const IDLE: SimulationState = { status: "idle" };

type TrackedRun = {
  config: MandateConfig;
  attempt: AgentAttempt;
  payer: string;
  state: SimulationState;
};

export function useSimulation(
  config: MandateConfig | null,
  attempt: AgentAttempt | null,
) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [run, setRun] = useState<TrackedRun | null>(null);
  const runId = useRef(0);

  const payer = publicKey?.toBase58() ?? null;

  // Hasil hanya berlaku untuk input yang sama persis dengan saat dijalankan.
  const state: SimulationState =
    run &&
    run.config === config &&
    run.attempt === attempt &&
    run.payer === payer
      ? run.state
      : IDLE;

  const start = useCallback(async () => {
    if (!config || !attempt || !publicKey || !payer) return;

    const id = ++runId.current;
    setRun({ config, attempt, payer, state: { status: "running" } });

    const outcome = await runSimulation(connection, {
      config,
      attempt,
      payer: publicKey,
    });

    // Ada run yang lebih baru: buang hasil ini.
    if (id !== runId.current) return;
    setRun({ config, attempt, payer, state: { status: "done", outcome } });
  }, [connection, config, attempt, publicKey, payer]);

  return { state, start, walletConnected: publicKey !== null };
}

export type SimulationController = ReturnType<typeof useSimulation>;