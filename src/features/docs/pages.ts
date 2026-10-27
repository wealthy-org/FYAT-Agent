import { allDocs } from "./data";

export type DocsSection = {
  id: string;
  title: string;
  body: readonly string[];
  bullets?: readonly string[];
  code?: { label: string; text: string };
};

export type DocsPageContent = {
  lead: string;
  sections: readonly DocsSection[];
};

/** Kunci = slug di data.ts. Slug yang belum diisi tampil sebagai "coming soon". */
export const docsPages: Record<string, DocsPageContent> = {
    introduction: {
    lead: "FYAT Agent builds complete Solana agent transaction flows, with mandate authorization built into the execution path. Give agents execution rights, not your private key.",
    sections: [
      {
        id: "the-problem",
        title: "The problem",
        body: [
          "Most agent bots sign with the owner's private key, often pasted into a .env file. One prompt injection can then move every asset the wallet holds.",
          "There is no spending cap, no approved target and no expiry. Cutting access means moving all funds away.",
        ],
      },
      {
        id: "how-fyat-changes-this",
        title: "How FYAT changes this",
        body: [
          "The owner signs one mandate that bounds what the agent may do. The agent receives a temporary session key instead of the owner's key, and funds sit in a vault the agent never controls.",
        ],
        bullets: [
          "Per-action cap and total budget",
          "One approved venue or recipient",
          "Automatic expiry and instant revoke",
          "A public receipt for every attempt, allowed or blocked",
        ],
      },
      {
        id: "current-status",
        title: "Current status",
        body: [
          "FYAT Agent is a Devnet prototype: unaudited, no token, no real funds. The Builder verifies and simulates plans today. Onchain enforcement by the mandate program is the design target and has not shipped yet.",
          "Receipts are recorded by a demo script until the program ships. Rows marked PASS link to real Devnet transactions.",
        ],
      },
    ],
  },
  "how-it-works": {
    lead: "An agent workflow becomes one plan that is checked against a mandate before anything is signed.",
    sections: [
      {
        id: "five-steps",
        title: "The five steps",
        body: [
          "Every workflow follows the same path, from raw actions to a recorded receipt.",
        ],
        code: {
          label: "FYAT execution flow",
          text: "Agent actions\n  ├─ 1  Build      → one transaction plan, exact base-unit amounts\n  ├─ 2  Verify     → cap, budget and target checked against the mandate\n  ├─ 3  Simulate   → dry-run on Solana RPC, nothing signed\n  ├─ 4  Execute    → the session key signs\n  └─ 5  Receipt    → every attempt is recorded publicly",
        },
      },
      {
        id: "who-holds-what",
        title: "Who holds what",
        body: [],
        bullets: [
          "Owner: the wallet, plus the right to revoke the session or withdraw.",
          "Agent: a temporary session key, limited by the mandate.",
          "Vault: a program-derived address with no private key.",
          "FYAT server: only the session public key, never a secret key.",
        ],
      },
      {
        id: "blocked-attempts",
        title: "Blocked attempts",
        body: [
          "If any rule fails, the plan stops at Verify. Simulation and execution are skipped, and the blocked attempt is still recorded as a receipt.",
        ],
      },
    ],
  },
  quickstart: {
    lead: "Configure a mandate in the Builder, preview the flow and copy the SDK code. Previewing needs no funds.",
    sections: [
      {
        id: "try-the-builder",
        title: "Try the Builder",
        body: ["Open the Builder and work from top to bottom."],
        bullets: [
          "Choose an action: Swap or Transfer.",
          "Set the per-action cap, the total budget and the expiry.",
          "Pick the approved venue (swap) or recipient (transfer).",
          "Enter an amount for the agent's attempt and choose an approved or unlisted target.",
          "Read the Build, Verify, Simulate and Execute steps.",
          "Copy the generated SDK snippet.",
        ],
      },
      {
        id: "simulate-a-transfer",
        title: "Simulate a transfer",
        body: [
          "Connect a wallet on Devnet with a little SOL for fees, then run the dry-run. The plan is tested on Solana RPC; nothing is signed or broadcast.",
          "Swap simulation is not configured yet and shows as unsupported.",
        ],
      },
      {
        id: "the-sdk-snippet",
        title: "The SDK snippet",
        body: [
          "The Builder generates code like this. @fyat/sdk is not published yet, so treat it as an illustration of the intended API.",
        ],
        code: {
          label: "Illustrative SDK usage",
          text: `const client = createFyatClient({
            network: "devnet",
            rpcUrl: "https://api.devnet.solana.com",
            });

            const mandate = await client.createMandate({
            vaultPda: "<YOUR_VAULT_PDA>",
            sessionSigner: agentKeypair.publicKey,
            permissions: {
                action: "SWAP",
                venue: "METEORA_DAMM",
                maxPerAction: 5_000_000, // 5 USDC
                maxTotal: 50_000_000, // 50 USDC
                expiresInHours: 24,
            },
            });

            const plan = await mandate.build({ amountIn: 3_000_000, venue: "METEORA_DAMM" });
            await plan.simulate(); // verifies the rules before broadcasting
            const signature = await plan.executeWithSession(agentKeypair);`,
        },
      },
    ],
  },
  installation: {
    lead: "Run the FYAT Agent web app locally. The SDK package is not published yet.",
    sections: [
      {
        id: "environment",
        title: "Environment",
        body: [
          "Public variables are read in the browser. Server variables stay on the server. The server also reads NEXT_PUBLIC_TOKEN_MINT, so it is required in practice.",
        ],
        code: {
          label: "Environment variables",
          text: "# Public\nNEXT_PUBLIC_SOLANA_NETWORK=devnet   # devnet | localnet\nNEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com\nNEXT_PUBLIC_TOKEN_MINT=<token mint address>\n\n# Server only\nDATABASE_URL=postgresql://user:password@localhost:5432/fyat\nAPP_URL=http://localhost:3000\nFYAT_PROGRAM_ID=<program address>",
        },
      },
      {
        id: "demo-data",
        title: "Demo data",
        body: [
          "Receipts are stored in Postgres. Seed a demo set so the Receipts feed is not empty.",
        ],
        code: { label: "Seed receipts", text: "pnpm db:seed" },
      },
    ],
  },
  "builder-overview": {
    lead: "The Transaction Builder is the product. Mandates, simulation and receipts are mechanics underneath it.",
    sections: [
      {
        id: "pipeline",
        title: "Pipeline",
        body: ["An agent workflow goes through these stages before anything is signed."],
        code: {
          label: "Execution pipeline",
          text: "Action[]\n  ├─ 1  Normalize\n  ├─ 2  Verify mandate\n  ├─ 3  Simulate\n  └─ 4  Execute",
        },
      },
      {
        id: "ordering-guarantee",
        title: "Ordering guarantee",
        body: ["Verification happens before simulation, so an unauthorized action never reaches execution."],
      },
    ],
  },
};

export function findDoc(slug: string) {
  return allDocs.find((doc) => doc.slug === slug);
}

export function getPager(slug: string) {
  const index = allDocs.findIndex((doc) => doc.slug === slug);
  const prev = allDocs[index - 1];
  const next = allDocs[index + 1];

  return {
    prev: prev ? { href: `/docs/${prev.slug}`, label: prev.label } : undefined,
    next: next ? { href: `/docs/${next.slug}`, label: next.label } : undefined,
  };
}