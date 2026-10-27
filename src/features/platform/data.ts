import type { FeatureRowData } from "./types";

export const platformFeatures: readonly FeatureRowData[] = [
  {
    id: "plan",
    title: "Build one execution plan",
    description:
      "Agent actions are collected into one transaction plan instead of being executed one by one.",
    bullets: [
      "Checks every step against the mandate",
      "Simulates the plan before anything is signed",
      "Keeps the full workflow under one mandate",
    ],
    summary: {
      label: "EXECUTION PLAN",
      title: "One plan, built before execution",
      rows: [
        "Actions",
        "Plan",
        "Scope check",
        "Cap check",
        "Simulation",
        "Session sign",
        "Execute",
      ],
      highlightedRow: 6,
    },
    detailLabel: "BUILDER",
    details: [
      {
        id: "build",
        title: "Build",
        body: "Swap or transfer parameters become one transaction plan, with exact amounts held in base units.",
      },
      {
        id: "verify",
        title: "Verify",
        body: "Per-action cap, total budget, approved target and expiry are checked against the mandate.",
      },
      {
        id: "simulate",
        title: "Simulate",
        body: "The plan is dry-run on Solana RPC. Nothing is signed or broadcast.",
      },
      {
        id: "execute",
        title: "Execute",
        body: "The agent's session key signs, and the program enforces the limits onchain.",
      },
      {
        id: "receipt",
        title: "Receipt",
        body: "Every attempt, allowed or blocked, is recorded as a public receipt.",
      },
    ],
    cta: { label: "Open Builder", href: "/builder" },
  },
  {
    id: "mandate",
    title: "Authorize the workflow once",
    description:
      "The owner defines the boundary a single time. The agent gets a temporary session key, never the owner's key.",
    bullets: [
      "Spend caps per action and in total",
      "One approved venue or recipient",
      "Automatic expiry and instant revoke",
    ],
    summary: {
      label: "SIGNED MANDATE",
      title: "The execution boundary",
      rows: [
        "Per-action cap",
        "Total budget",
        "Approved target",
        "Action type",
        "Expiry",
        "Session key",
      ],
      highlightedRow: 5,
    },
    detailLabel: "MANDATE",
    details: [
      {
        id: "budget",
        title: "Spend budget",
        body: "Caps what the agent can spend per action and across the whole session.",
      },
      {
        id: "target",
        title: "Approved target",
        body: "Swaps go through one approved venue. Transfers go to one approved recipient.",
      },
      {
        id: "expiry",
        title: "Expiry",
        body: "The session stops working on its own at the time the owner chose.",
      },
      {
        id: "session",
        title: "Session key",
        body: "A temporary keypair for the agent. Only its public key is ever shared with us.",
      },
      {
        id: "revoke",
        title: "Revocation",
        body: "The owner can revoke the session at any moment. The agent loses its rights.",
      },
    ],
    cta: { label: "Explore protocol", href: "/#security" },
  },
  {
    id: "vault",
    title: "Keep funds in a vault",
    description:
      "Funds sit in a program-derived address with no private key, so the agent never holds them.",
    bullets: [
      "Vault address derived from the owner's wallet",
      "Withdraw at any moment",
      "Our server never holds your keys",
    ],
    summary: {
      label: "PDA VAULT",
      title: "No key to steal",
      rows: [
        "Owner wallet",
        "Vault PDA",
        "Mandate",
        "Session key",
        "Policy check",
        "Transfer",
      ],
      highlightedRow: 1,
    },
    detailLabel: "VAULT",
    details: [
      {
        id: "pda",
        title: "Vault PDA",
        body: "A program-derived address with no private key. Only the mandate program can move the funds.",
      },
      {
        id: "policy",
        title: "Policy check",
        body: "Cap, budget, target and expiry are verified before any transfer executes.",
      },
      {
        id: "withdraw",
        title: "Withdraw",
        body: "The owner can withdraw the remaining balance at any time.",
      },
      {
        id: "audit",
        title: "Audit trail",
        body: "Each attempt leaves a receipt that links to the Solana Explorer.",
      },
    ],
    cta: { label: "Read the docs", href: "/#developers" },
  },
];