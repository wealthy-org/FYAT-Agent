import type { FeatureRowData } from "./types";

export const platformFeatures: readonly FeatureRowData[] = [
  {
    id: "architecture",
    eyebrow: "01 / Architecture",
    title: "All agent actions. One bounded execution layer.",
    description:
      "Compose swap and transfer flows into a single plan. Every plan is checked against the owner's mandate before anything is signed.",
    pillars: ["Build", "Simulate", "Execute"],
    cta: { label: "Open Builder", href: "/#builder" },
    mock: {
      label: "TRANSACTION BUILDER",
      title: "One plan, built before execution.",
      highlightedLine: 2,
    },
  },
  {
    id: "mandates",
    eyebrow: "02 / Mandates",
    title: "From owner intent to scoped authority.",
    description:
      "The owner sets spend caps, allowed actions, and expiry once. The agent receives a temporary session key, never the owner's private key.",
    pillars: ["Intent", "Session key", "Limits"],
    cta: { label: "Explore protocol", href: "/#security" },
    mock: {
      label: "MANDATE",
      title: "Scoped authority, not a private key.",
      highlightedLine: 1,
    },
  },
  {
    id: "control",
    eyebrow: "03 / Control",
    title: "Execution under explicit control.",
    description:
      "Funds sit in a program-controlled vault. Every operation is inspectable, and the owner can revoke the session or withdraw at any moment.",
    pillars: ["Validate", "Authorize", "Revoke"],
    cta: { label: "Read the docs", href: "/#developers" },
    mock: {
      label: "EXECUTION BOUNDARY",
      title: "The execution boundary.",
      highlightedLine: 3,
    },
  },
];