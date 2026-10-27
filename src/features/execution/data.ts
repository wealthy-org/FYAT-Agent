/* 01 · Builder */
export const builderSteps = [
  "Actions",
  "Plan",
  "Scope",
  "Budget",
  "Simulation",
  "Session sign",
  "Execute",
] as const;

/** `step` = indeks builderSteps yang menyalakan item ini. */
export const builderHandles = [
  { label: "Plan construction", step: 1 },
  { label: "Scope verification", step: 2 },
  { label: "Target matching", step: 2 },
  { label: "Spend accounting", step: 3 },
  { label: "Expiry check", step: 3 },
  { label: "Plan simulation", step: 4 },
  { label: "Session signing", step: 5 },
  { label: "Receipt recording", step: 6 },
] as const;

/* 02 · One graph */
export const graphNodes = [
  {
    id: "plan",
    title: "Plan",
    lead: "Agent actions become nodes in one workflow.",
    body: "FYAT tracks their order and mandate requirements before anything is signed.",
  },
  {
    id: "mandate",
    title: "Mandate",
    lead: "The owner signs the boundary once.",
    body: "Per-action cap, total budget, approved target and expiry are checked for every step.",
  },
  {
    id: "onchain",
    title: "Onchain",
    lead: "Only verified transfers reach Solana.",
    body: "The vault program enforces the same limits again at execution time.",
  },
] as const;

/* 03 · Before and after */
export type FlowItem = { label: string; tone?: "bad" | "primary" };

export const withoutFyat: readonly FlowItem[] = [
  { label: "Agent" },
  { label: "swap request" },
  { label: "owner key in .env", tone: "bad" },
  { label: "transfer request" },
  { label: "signed with owner key", tone: "bad" },
  { label: "no cap, no expiry", tone: "bad" },
  { label: "funds exposed", tone: "bad" },
];

export const withFyat: readonly FlowItem[] = [
  { label: "Agent" },
  { label: "FYAT Builder" },
  { label: "Build + Verify + Simulate" },
  { label: "Session key signs" },
  { label: "Vault transfer", tone: "primary" },
];

/* 04 · Receipts */
export const receiptRows = [
  { label: "Action", value: "transfer" },
  { label: "Target", value: "7xKq…9f2" },
  { label: "Authorized", value: "YES", accent: true },
  { label: "Requested value", value: "42 USDC" },
  { label: "Per-action cap", value: "100 USDC" },
  { label: "Transaction", value: "5Hq…2xP" },
  { label: "Status", value: "EXECUTED", accent: true },
] as const;

export const receiptRecords = [
  "Signed mandate",
  "Requested action",
  "Builder decision",
  "Policy result",
  "Transaction signature",
  "Spend",
  "Timestamp",
] as const;

/* 05 · Security */
export const securityItems = [
  {
    id: "scope",
    title: "Signed scope",
    body: "The execution boundary is signed by the owner before the workflow starts.",
  },
  {
    id: "replay",
    title: "Replay protection",
    body: "Nonces prevent a signed request from being used twice.",
  },
  {
    id: "spend",
    title: "Spend accounting",
    body: "Every transfer reduces the remaining mandate budget.",
  },
  {
    id: "expiry",
    title: "Expiry",
    body: "Authority ends on its own at the time the owner chose.",
  },
  {
    id: "revocation",
    title: "Revocation",
    body: "The owner can revoke unused authority at any moment.",
  },
  {
    id: "simulation",
    title: "Simulation",
    body: "Every plan is dry-run on Solana RPC before it is signed.",
  },
] as const;