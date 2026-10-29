import "server-only";

import { ApiError } from "../api/errors";
import { registerFaucetClaim } from "../repositories/faucet-claims";
import { RATE_LIMITS } from "./rate-limit";

export async function enforceFaucetWalletLimit(wallet: string): Promise<void> {
  const rule = RATE_LIMITS.faucetClaim;
  const retryAfter = await registerFaucetClaim(wallet, rule.windowSeconds);

  if (retryAfter !== null) {
    throw new ApiError(
      429,
      "FAUCET_WALLET_LIMIT",
      "This wallet has already claimed test funds. Try again after the 24-hour cooldown.",
      { headers: { "Retry-After": String(retryAfter) } },
    );
  }
}
