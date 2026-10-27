import type { ComparisonSide } from "./types";

export const withoutFyat: ComparisonSide = {
  title: "Without FYAT",
  description: "The agent holds the keys.",
  points: [
    "The owner's private key is pasted into the bot's .env file",
    "One prompt injection can drain 100% of the funds",
    "No spending cap, allowed target, or expiry",
    "Cutting access means moving every asset away",
    "Actions leave no easy-to-audit trail",
  ],
};

export const withFyat: ComparisonSide = {
  title: "With FYAT",
  description: "The agent holds a scoped, temporary session key.",
  points: [
    "The agent signs with a session key, never the owner's key",
    "Funds sit in a program-controlled vault",
    "Per-action cap, total budget, target, and expiry are checked before execution",
    "The owner can revoke the session or withdraw at any moment",
    "Every attempt, allowed or blocked, lands in a public receipt",
  ],
};