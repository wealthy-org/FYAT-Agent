"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { createFyatProgram } from "@/lib/fyat-program";

import type { MandateCreatorController } from "../mandate-creator-types";
import {
  probeExecuteTransfer,
  type OnchainProbeResult,
} from "../simulation/simulate-onchain";
import type { AgentAttempt } from "../types";

export type OnchainProbeState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; result: OnchainProbeResult }
  | { status: "error"; message: string };

/** Menguji percobaan agent langsung ke program onchain, melewati penyaring UI. */
export function useOnchainProbe(controller: MandateCreatorController) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [state, setState] = useState<OnchainProbeState>({ status: "idle" });

  const { activeMandate } = controller;
  const sessionBase58 = controller.sessionPubkey || controller.externalAgent;

  const run = useCallback(
    async (attempt: AgentAttempt) => {
      if (!wallet.publicKey || !activeMandate || !sessionBase58) return;

      setState({ status: "running" });
      try {
        const session = new PublicKey(sessionBase58);
        const result = await probeExecuteTransfer({
          connection,
          program: createFyatProgram(connection, wallet),
          feePayer: wallet.publicKey,
          session,
          mandate: activeMandate,
          // UNAPPROVED = agent mencoba mengirim ke wallet-nya sendiri.
          destinationOwner:
            attempt.target === "ALLOWED"
              ? new PublicKey(activeMandate.recipient)
              : session,
          amount: attempt.amount,
        });
        setState({ status: "done", result });
      } catch (cause) {
        setState({
          status: "error",
          message:
            cause instanceof Error ? cause.message : "On-chain test failed.",
        });
      }
    },
    [activeMandate, connection, sessionBase58, wallet],
  );

  return {
    state,
    run,
    ready: !!wallet.publicKey && !!activeMandate && !!sessionBase58,
  };
}