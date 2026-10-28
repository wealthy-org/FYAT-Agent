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
  // "mandate-overview"
    mandates: {
    lead: "A mandate is the boundary the owner signs once. It decides what an agent may do, how much it may spend and for how long.",
    sections: [
      {
        id: "what-a-mandate-contains",
        title: "What a mandate contains",
        body: [
          "Each mandate belongs to one vault and is tied to one session key. The agent signs with that session key, never with the owner's wallet.",
        ],
        bullets: [
          "Action: SWAP or TRANSFER.",
          "Target: the approved venue for a swap, or the approved recipient address for a transfer.",
          "Per-action cap: the largest amount a single attempt may move.",
          "Total budget: the most the mandate may spend in its lifetime. The amount already spent is tracked against it.",
          "Expiry: 1 hour, 6 hours, 24 hours, 3 days or 7 days.",
        ],
      },
      {
        id: "amounts",
        title: "Amounts",
        body: [
          "Amounts are USDC with 6 decimals and are handled as exact integers in base units, never as floating-point numbers. 2.5 USDC is stored as 2500000.",
          "The per-action cap cannot exceed the total budget, and no amount may be above the 10,000 USDC safety limit. The browser and the server use the same validation schema, so their rules cannot drift apart.",
        ],
      },
      {
        id: "status",
        title: "Status",
        body: [
          "A mandate is ACTIVE, REVOKED or EXPIRED. The status is calculated every time it is read instead of being stored, so it is never out of date.",
          "Expiry uses the server clock, not the clock of the browser that created the mandate. Revoking sets a timestamp and takes effect immediately.",
        ],
      },
      {
        id: "creating-a-mandate",
        title: "Creating a mandate",
        body: [
          "The owner wallet signs the request. The vault is derived on the server from the signing wallet, so a client cannot attach a mandate to someone else's vault. The session key must be different from the owner wallet.",
        ],
        code: {
          label: "POST /api/mandates",
          text: `{
  "sessionPubkey": "<agent session public key>",
  "config": {
    "action": "TRANSFER",
    "recipient": "<approved recipient address>",
    "maxPerAction": "5",
    "maxTotal": "50",
    "expiresInHours": "24"
  }
}`,
        },
      },
      {
        id: "revoking",
        title: "Revoking",
        body: [
          "Only the owner can revoke a mandate. Ownership is checked inside the database query. A mandate that does not exist, is already revoked or belongs to another wallet all return the same not-found message, which prevents guessing which mandate IDs exist.",
        ],
        code: { label: "Revoke a mandate", text: "POST /api/mandates/{id}/revoke" },
      },
    ],
  },
  "actions-and-plans": {
    lead: "An action is what the agent wants to do. A plan is that action made exact and ready to be checked.",
    sections: [
      {
        id: "actions",
        title: "Actions",
        body: [
          "FYAT supports two actions today: SWAP and TRANSFER. Both are described by the same few fields: the action, an exact amount and a target.",
        ],
        bullets: [
          "Transfer: send USDC to a recipient address.",
          "Swap: trade through an approved venue. Meteora DAMM is the only venue so far.",
        ],
      },
      {
        id: "what-a-plan-is",
        title: "What a plan is",
        body: [
          "The Build step turns an attempt into a plan with an exact base-unit amount and a clear summary, for example: Transfer 3 USDC to 7xKq…9f2. Nothing is signed at this point.",
          "If the mandate form is incomplete or the amount is invalid, the Build step waits and tells you what is missing. Later steps stay idle.",
        ],
      },
      {
        id: "transfer-plan",
        title: "How a transfer is built",
        body: [
          "A transfer plan contains two instructions in one transaction. The first creates the recipient's token account if it does not exist yet, and is safe to repeat. The second moves the tokens using the checked transfer instruction, which also verifies the decimals.",
          "Recipients may be program-derived addresses, so an address that has no private key can still receive funds.",
        ],
        code: {
          label: "Transfer plan",
          text: "1  createAssociatedTokenAccountIdempotent(recipient)\n2  transferChecked(amount, decimals = 6)",
        },
      },
      {
        id: "swap-plans",
        title: "Swap plans",
        body: [
          "Swap plans are verified against the mandate like any other plan. Building and simulating the Meteora transaction arrives with the Meteora adapter, so swap simulation currently reports as unsupported.",
        ],
      },
    ],
  },
  receipts: {
    lead: "Every attempt leaves a public record, whether it was allowed or blocked.",
    sections: [
      {
        id: "statuses",
        title: "Statuses",
        body: ["A receipt always has one of three statuses."],
        bullets: [
          "SUCCESS: the attempt passed every check and has a transaction signature.",
          "REJECTED_BY_POLICY: a mandate rule failed at the Verify step. Nothing was simulated or signed.",
          "FAILED_SIMULATION: the rules passed, but the dry-run on Solana RPC failed.",
        ],
      },
      {
        id: "what-is-recorded",
        title: "What is recorded",
        body: [
          "Each receipt shows the session key that made the attempt, the action, the amount, the status, the reason when there is one, the transaction signature for successful attempts and the time.",
        ],
      },
      {
        id: "reading-the-feed",
        title: "Reading the feed",
        body: [
          "The receipts feed is public and read-only. It returns up to 50 receipts per request, newest first, and pages through them with a cursor. Without a limit it returns 20.",
        ],
        code: {
          label: "GET /api/receipts",
          text: "GET /api/receipts?limit=20\nGET /api/receipts?limit=20&cursor=<nextCursor from the previous page>",
        },
      },
      {
        id: "demo-receipts",
        title: "About demo receipts",
        body: [
          "Until the onchain program ships, receipts are written by a demo script. Successful rows link to real Devnet transactions, but those transactions are plain transfers signed by an agent key, not enforced by the mandate program.",
        ],
      },
    ],
  },

  //transaction-builder
    "scope-verification": {
    lead: "Verify compares an attempt with the mandate. It runs before simulation, so an unauthorized action never gets that far.",
    sections: [
      {
        id: "the-three-checks",
        title: "The three checks",
        body: [
          "Every attempt is tested against three rules. All three must pass.",
        ],
        bullets: [
          "Per-action cap: the amount must be at most the per-action cap.",
          "Total budget: the amount must be at most the budget that remains after what is already spent.",
          "Approved target: the venue or recipient must be the one named in the mandate.",
        ],
      },
      {
        id: "reading-the-result",
        title: "Reading the result",
        body: [
          "The Builder lists each check with the numbers behind it, so a blocked attempt explains itself.",
        ],
        code: {
          label: "Example: a blocked swap",
          text: "Per-action cap   PASS   3 USDC vs cap 5 USDC\nTotal budget     PASS   3 USDC vs 50 USDC remaining\nApproved venue   FAIL   Unlisted venue is not in the mandate\n\nRejected by mandate: 1 rule failed.",
        },
      },
      {
        id: "when-a-rule-fails",
        title: "When a rule fails",
        body: [
          "The Verify step is marked blocked. Simulate and Execute are skipped, nothing is signed or broadcast, and the attempt is recorded as a REJECTED_BY_POLICY receipt.",
        ],
      },
      {
        id: "expiry-and-revocation",
        title: "Expiry and revocation",
        body: [
          "A mandate that has expired or been revoked cannot authorize anything. This comes from the mandate status, which the server calculates from its own clock, rather than from the three checks above.",
          "In the Builder preview the amount already spent is treated as zero, so the full budget is available.",
        ],
      },
      {
        id: "defense-in-depth",
        title: "Defense in depth",
        body: [
          "The simulation function checks the rules again by itself and refuses to run a blocked attempt, even if the interface lets it through. It does not trust the button that called it.",
        ],
      },
    ],
  },
  simulation: {
    lead: "Simulation tests a plan on Solana RPC before anything is signed. It tells you whether the network would accept the transaction.",
    sections: [
      {
        id: "what-simulation-does",
        title: "What simulation does",
        body: [
          "The plan is sent to Solana RPC as a dry-run. The signature is not verified and the blockhash is replaced by the network, so no wallet signature is needed and nothing is broadcast.",
          "Only attempts that passed Verify are simulated. Transfers can be simulated today.",
        ],
      },
      {
        id: "before-you-run-it",
        title: "Before you run it",
        body: ["The dry-run needs a few things to be in place."],
        bullets: [
          "A connected wallet on Devnet with a little SOL for fees.",
          "A configured token mint in NEXT_PUBLIC_TOKEN_MINT (run pnpm mint:setup).",
          "A token account for that mint in the connected wallet.",
        ],
      },
      {
        id: "outcomes",
        title: "Outcomes",
        body: ["A simulation always ends in one of four outcomes."],
        bullets: [
          "Passed: the network says the transaction would succeed. The compute units used are shown.",
          "Failed: the network rejected it. This is a valid answer, not an application error.",
          "Unsupported: simulation cannot run for this case, for example a swap or a missing mint setting.",
          "Error: the RPC could not be reached, timed out or rate limited. Try again.",
        ],
      },
      {
        id: "failure-reasons",
        title: "Failure reasons",
        body: ["When a dry-run fails, FYAT explains why in plain language."],
        bullets: [
          "Mint not found on this network.",
          "The wallet has no token account for this mint yet.",
          "Not enough tokens for the transfer.",
          "Not enough SOL for fees or for the recipient's token account.",
          "Any other rejection, with the program logs attached.",
        ],
      },
      {
        id: "program-logs",
        title: "Program logs",
        body: [
          "Logs come from outside the application, so FYAT treats them as untrusted. Only the last 12 lines are kept, each is cut to 200 characters, and they are always rendered as plain text.",
          "Each RPC call times out after 15 seconds.",
        ],
      },
    ],
  },

  // security
    security: {
    lead: "FYAT is designed so that a compromised agent, a forged request or a replayed signature cannot move more than the mandate allows.",
    sections: [
      {
        id: "what-we-defend-against",
        title: "What we defend against",
        body: [
          "The main risk is an agent that has been tricked, for example by a prompt injection. Because the agent only holds a temporary session key limited by a mandate, the worst it can do is stay inside that mandate until it expires or is revoked.",
        ],
        bullets: [
          "The owner's private key is never given to the agent or to the FYAT server.",
          "Funds sit in a vault address with no private key.",
          "Cap, budget, target and expiry are set by the owner, not by the agent.",
        ],
      },
      {
        id: "signed-requests",
        title: "Signed requests",
        body: [
          "Every request that changes something must be signed by the owner wallet. The signature covers the domain, the wallet, the HTTP method, the path, a hash of the body, a nonce and the time. The server rebuilds this message itself and verifies the signature, so a signature for one request cannot be reused for another.",
          "Requests are read, then authenticated, and only then validated. A caller without a valid signature never reaches validation.",
        ],
        code: {
          label: "What the wallet is asked to sign",
          text: "FYAT Agent: authorize this request\n\nDomain: <app host>\nWallet: <owner address>\nRequest: POST /api/mandates\nBody SHA-256: <hash of the body>\nNonce: <32 hex characters>\nIssued At: <ISO-8601 UTC time>\n\nSign only if you started this action on the site above.",
        },
      },
      {
        id: "replay-protection",
        title: "Replay protection",
        body: [
          "A signature is accepted only for 5 minutes, with up to 1 minute of tolerance for a client clock that runs ahead. Each nonce can be used once, and the check is a single atomic database insert, so two requests with the same nonce cannot both succeed.",
          "A nonce is stored only after its signature is valid, which stops someone without a key from filling the nonce table.",
        ],
      },
      {
        id: "server-side-rules",
        title: "Server-side rules",
        body: ["The server does not trust the browser for anything that matters."],
        bullets: [
          "The vault is derived from the signing wallet, not taken from the request.",
          "Expiry is calculated with the server clock.",
          "Ownership checks for revoking run inside the SQL query.",
          "Request bodies must match their schema exactly; unknown fields are rejected.",
          "Unexpected errors return a generic 500 and never expose internals.",
        ],
      },
      {
        id: "rate-limits",
        title: "Rate limits",
        body: ["Each limit applies per client address and per minute."],
        bullets: [
          "Vault registration: 10 requests.",
          "Mandate creation: 20 requests.",
          "Mandate revocation: 30 requests.",
          "Receipts feed: 60 requests.",
        ],
      },
      {
        id: "known-limits",
        title: "Known limits",
        body: [
          "FYAT Agent is a Devnet prototype and has not been audited. The mandate rules are checked by the Builder and the server today. Enforcement inside the onchain program is the design target and has not shipped, so do not treat the current checks as a substitute for it.",
          "Do not use real funds or a key you care about while the program is not live.",
        ],
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