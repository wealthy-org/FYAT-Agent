export const USDC_DECIMALS = 6;
export const ASSET_LABEL = "USDC (Devnet)";

export const ASSET_SYMBOL = "USDC";

export const PREVIEW_SPENT_UNITS = 0n;

/** Batas pengaman: 10,000 USDC dalam base unit. */
export const MAX_AMOUNT_UNITS = 10_000_000_000n;

export const MANDATE_ACTIONS = ["SWAP", "TRANSFER"] as const;

export const ACTION_OPTIONS = [
  { value: "SWAP", label: "Swap" },
  { value: "TRANSFER", label: "Transfer" },
] as const;

export const SWAP_VENUES = ["METEORA_DAMM"] as const;

export const VENUE_OPTIONS = [
  { value: "METEORA_DAMM", label: "Meteora DAMM" },
] as const;

export const EXPIRY_HOURS = ["1", "6", "24", "72", "168"] as const;

export const EXPIRY_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "6", label: "6 hours" },
  { value: "24", label: "24 hours" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" },
] as const;