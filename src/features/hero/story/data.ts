export type NodeKind = "accent" | "ghost" | "light";

export type StoryNode = {
  id: string;
  label: string;
  kind: NodeKind;
  /** Diameter dalam px. */
  size: number;
  x: number;
  y: number;
  /** Faktor parallax: makin besar = makin cepat naik. */
  depth: number;
  mobile?: boolean;
};

/** Posisi diperkirakan dari video; sesuaikan sambil membandingkan. */
export const storyNodes: readonly StoryNode[] = [
  { id: "swap", label: "SWAP", kind: "accent", size: 46, x: -0.42, y: -0.62, depth: 1.0, mobile: true },
  { id: "xfer", label: "XFER", kind: "accent", size: 40, x: 0.24, y: -0.78, depth: 0.8, mobile: true },
  { id: "rpc", label: "RPC", kind: "accent", size: 30, x: 0.68, y: -0.86, depth: 0.6 },
  { id: "pda", label: "PDA", kind: "accent", size: 38, x: -0.12, y: -0.92, depth: 1.1, mobile: true },
  { id: "pol", label: "POL", kind: "ghost", size: 36, x: -0.74, y: -0.78, depth: 0.7, mobile: true },
  { id: "sim", label: "SIM", kind: "ghost", size: 26, x: 0.92, y: -0.52, depth: 0.5 },
  { id: "usdc", label: "USDC", kind: "accent", size: 54, x: -0.62, y: -0.12, depth: 1.2 },
  { id: "exe", label: "EXE", kind: "ghost", size: 32, x: -0.95, y: 0.02, depth: 0.7 },
  { id: "h24", label: "24h", kind: "accent", size: 44, x: 0.56, y: -0.34, depth: 0.9 },
  { id: "cap", label: "5.0", kind: "accent", size: 34, x: 0.9, y: -0.18, depth: 0.7 },
  { id: "tot", label: "50", kind: "accent", size: 50, x: 0.64, y: 0.1, depth: 1.1 },
  { id: "dev", label: "DEV", kind: "light", size: 30, x: 0.8, y: 0.36, depth: 0.8 },
  { id: "sol", label: "SOL", kind: "accent", size: 52, x: -0.5, y: 0.34, depth: 1.2 },
  { id: "key", label: "KEY", kind: "accent", size: 44, x: -0.16, y: 0.56, depth: 1.0, mobile: true },
  { id: "ver", label: "VER", kind: "ghost", size: 36, x: -0.8, y: 0.52, depth: 0.8, mobile: true },
  { id: "bld", label: "BLD", kind: "ghost", size: 38, x: -0.34, y: 0.84, depth: 0.9, mobile: true },
  { id: "api", label: "API", kind: "ghost", size: 24, x: -0.93, y: 0.82, depth: 0.5 },
  { id: "agt", label: "AGT", kind: "light", size: 32, x: 0.18, y: 0.92, depth: 0.7, mobile: true },
  { id: "own", label: "OWN", kind: "light", size: 38, x: 0.46, y: 0.64, depth: 1.0, mobile: true },
  { id: "spl", label: "SPL", kind: "accent", size: 30, x: 0.92, y: 0.78, depth: 0.6, mobile: true },
  { id: "ses", label: "SES", kind: "ghost", size: 28, x: 0.12, y: 0.7, depth: 0.8 },
];

export const storyCopy = {
  first: {
    title: "One workflow. Built before execution.",
    body: "An agent may need dozens of swaps, transfers and approvals to finish one job.",
  },
  second: {
    body: "FYAT collects those actions first, builds the plan, verifies each one against the owner's mandate, and simulates before anything is signed.",
    flow: "Agent workflow → FYAT Builder → Verify → Simulate → Execute",
  },
} as const;

/** Ilustrasi alur, BUKAN data langsung. Strip diberi label "Example". */
export const storyStats = [
  { id: "requested", value: 143, label: "requested actions" },
  { id: "allowed", value: 31, label: "within the mandate" },
  { id: "executed", value: 9, label: "executed", highlight: true },
] as const;

export const storyPill = "Solana Devnet";