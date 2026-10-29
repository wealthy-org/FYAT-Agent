import type { MandateConfig } from "./types";

export type CreatedMandate = {
  signature: string;
  mandatePda: string;
  sessionPubkey: string;
  response: unknown;
  id: string;
};

export type ActiveMandate = {
  id: string;
  mandatePda: string;
  owner: string;
  mint: string;
  recipient: string;
  maxPerAction: bigint;
  maxTotal: bigint;
};

export type MandateCreatorController = {
  create: (
    config: MandateConfig,
    agentPubkey?: string,
  ) => Promise<CreatedMandate>;
  execute: (amount: bigint) => Promise<string>;
  saveSession: (passphrase: string) => Promise<void>;
  restoreSession: (
    mandatePda: string,
    passphrase: string,
  ) => Promise<ActiveMandate>;
  storedSessions: string[];
  sessionBusy: boolean;
  refreshStoredSessions: () => void;
  /** Public key agent bila session key dipegang agent, bukan browser. */
  externalAgent: string;
  busy: boolean;
  status: string;
  error: string;
  signature: string;
  sessionPubkey: string;
  activeMandate: ActiveMandate | null;
};
