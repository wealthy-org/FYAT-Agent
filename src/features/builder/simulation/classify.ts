import type { SimulationFailureCode } from "./types";

type FailureDetail = { code: SimulationFailureCode; message: string };

function logMatches(logs: readonly string[], pattern: RegExp): boolean {
  return logs.some((line) => pattern.test(line));
}

export function classifyFailure(
  err: unknown,
  logs: readonly string[],
): FailureDetail {
  // Fee payer tidak punya akun sama sekali di jaringan ini.
  if (err === "AccountNotFound") {
    return {
      code: "INSUFFICIENT_SOL",
      message:
        "Your wallet has no SOL on this network to pay fees. Request devnet SOL from the faucet.",
    };
  }

  if (logMatches(logs, /insufficient funds/i)) {
    return {
      code: "INSUFFICIENT_TOKEN_BALANCE",
      message: "Your wallet does not hold enough of this token for the transfer.",
    };
  }

  if (logMatches(logs, /insufficient lamports/i)) {
    return {
      code: "INSUFFICIENT_SOL",
      message:
        "Your wallet does not have enough SOL to cover fees and the recipient's token account.",
    };
  }

  return {
    code: "REJECTED",
    message:
      "The network rejected the simulated transaction. See the program logs for details.",
  };
}