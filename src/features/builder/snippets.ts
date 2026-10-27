import { env } from "@/lib/env";

import { evaluatePolicy, formatAmount } from "./policy";
import type { AgentAttempt, MandateConfig } from "./types";

const INDENT = "  ";
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function str(value: string): string {
  return JSON.stringify(value);
}

/** 5000000n → "5_000_000". Jadi literal bigint ("n") bila melebihi batas angka aman JS. */
function units(value: bigint): string {
  const digits = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "_");
  return value > MAX_SAFE ? `${digits}n` : digits;
}

function permissionLines(config: MandateConfig): string[] {
  const common = [
    `maxPerAction: ${units(config.maxPerAction)}, // ${formatAmount(config.maxPerAction)}`,
    `maxTotal: ${units(config.maxTotal)}, // ${formatAmount(config.maxTotal)}`,
    `expiresInHours: ${config.expiresInHours},`,
  ];

  if (config.action === "SWAP") {
    return [
      `action: "SWAP",`,
      `inputMint: "USDC_DEVNET_MINT",`,
      `venue: ${str(config.venue)},`,
      ...common,
    ];
  }

  return [
    `action: "TRANSFER",`,
    `mint: "USDC_DEVNET_MINT",`,
    `recipient: ${str(config.recipient)},`,
    ...common,
  ];
}

function buildCallLines(
  config: MandateConfig,
  attempt: AgentAttempt,
): string[] {
  const evaluation = evaluatePolicy(config, attempt);
  const amount = units(attempt.amount);
  const approved = attempt.target === "ALLOWED";

  const call =
    config.action === "SWAP"
      ? `const plan = await mandate.build({ amountIn: ${amount}, venue: ${
          approved ? str(config.venue) : `"UNLISTED_VENUE"`
        } });`
      : `const plan = await mandate.build({ amount: ${amount}, recipient: ${
          approved
            ? str(config.recipient)
            : "agentKeypair.publicKey.toBase58()"
        } });`;

  const lines = ["// 3. The agent plans, simulates, and executes."];

  if (!evaluation.allowed) {
    const failed = evaluation.checks
      .filter((check) => !check.passed)
      .map((check) => check.label)
      .join(", ");
    lines.push(`// Rejected by the mandate (${failed}), refused onchain.`);
  }

  lines.push(
    call,
    "await plan.simulate(); // dry-run before broadcasting",
    "const signature = await plan.executeWithSession(agentKeypair);",
  );

  return lines;
}

export function generateSdkSnippet(
  config: MandateConfig,
  attempt: AgentAttempt | null,
): string {
  const lines = [
    "// Illustrative API: @fyat/sdk is not published yet.",
    `import { createFyatClient } from "@fyat/sdk";`,
    "",
    "// 1. Initialize the client.",
    `const client = createFyatClient({ network: ${str(env.NEXT_PUBLIC_SOLANA_NETWORK)} });`,
    "",
    "// 2. The owner defines a constrained mandate.",
    "const mandate = await client.createMandate({",
    `${INDENT}vaultPda: "<YOUR_VAULT_PDA>",`,
    `${INDENT}sessionSigner: agentKeypair.publicKey,`,
    `${INDENT}permissions: {`,
    ...permissionLines(config).map((line) => `${INDENT}${INDENT}${line}`),
    `${INDENT}},`,
    "});",
    "",
  ];

  if (attempt) {
    lines.push(...buildCallLines(config, attempt));
  } else {
    lines.push("// Enter a valid amount to preview the agent's call.");
  }

  return lines.join("\n");
}

/** Bentuk payload mandate. Jumlah berupa string karena JSON tidak mengenal bigint. */
export function generateMandateJson(config: MandateConfig): string {
  return JSON.stringify(
    config,
    (_key, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value,
    2,
  );
}