import { KeyRound, ShieldCheck, Vault } from "lucide-react";

import type { ProtocolPrimitive } from "./types";

export const protocolPrimitives: readonly ProtocolPrimitive[] = [
  {
    id: "session-key",
    title: "Session Key",
    description:
      "A temporary keypair generated for the agent. It can sign only what the mandate allows, and it expires on schedule.",
    icon: KeyRound,
  },
  {
    id: "pda-vault",
    title: "PDA Vault",
    description:
      "Funds sit in a program-derived address that has no private key. Only the mandate program can move them, and only within policy.",
    icon: Vault,
  },
  {
    id: "policy-check",
    title: "Policy Check",
    description:
      "Per-action cap, total budget, allowed action, and expiry are verified onchain before any transfer executes.",
    icon: ShieldCheck,
  },
];