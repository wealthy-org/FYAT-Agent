"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";

import { createFyatProgram } from "@/lib/fyat-program";
import { runSimulation } from "../simulation/simulate";
import type { SimulationState } from "../simulation/types";
import type { ActiveMandate } from "../mandate-creator-types";
import type { AgentAttempt, MandateConfig } from "../types";

const IDLE: SimulationState = { status: "idle" };

type TrackedRun = {
  config: MandateConfig;
  attempt: AgentAttempt;
  payer: string;
  activeMandate: ActiveMandate | null;
  sessionPubkey: string;
  state: SimulationState;
};

export function useSimulation(
  config: MandateConfig | null,
  attempt: AgentAttempt | null,
  activeMandate: ActiveMandate | null,
  sessionPubkey: string,
) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [run, setRun] = useState<TrackedRun | null>(null);
  const runId = useRef(0);

  const payer = publicKey?.toBase58() ?? null;

  // Hasil hanya berlaku untuk input yang sama persis dengan saat dijalankan.
  const state: SimulationState =
    run &&
    run.config === config &&
    run.attempt === attempt &&
    run.payer === payer &&
    run.activeMandate === activeMandate &&
    run.sessionPubkey === sessionPubkey
      ? run.state
      : IDLE;

  const start = useCallback(async () => {
    if (!config || !attempt || !publicKey || !payer) return;

    const id = ++runId.current;
    setRun({
      config,
      attempt,
      payer,
      activeMandate,
      sessionPubkey,
      state: { status: "running" },
    });

    let outcome;
    try {
      outcome = await runSimulation(connection, {
        config,
        attempt,
        payer: publicKey,
        ...(config.action === "SWAP"
          ? {
              program: createFyatProgram(connection, wallet),
              sessionPubkey: sessionPubkey
                ? new PublicKey(sessionPubkey)
                : undefined,
              activeMandate,
            }
          : {}),
      });
    } catch (error) {
      outcome = {
        kind: "ERROR" as const,
        message:
          error instanceof Error
            ? error.message
            : "Could not prepare the simulation.",
      };
    }

    // Ada run yang lebih baru: buang hasil ini.
    if (id !== runId.current) return;
    setRun({
      config,
      attempt,
      payer,
      activeMandate,
      sessionPubkey,
      state: { status: "done", outcome },
    });
  }, [
    activeMandate,
    connection,
    config,
    attempt,
    publicKey,
    payer,
    sessionPubkey,
    wallet,
  ]);

  return { state, start, walletConnected: publicKey !== null };
}

export type SimulationController = ReturnType<typeof useSimulation>;