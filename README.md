# FYAT Agent

**Give agents execution rights, not your private key.**

FYAT Agent is a transaction builder and mandate protocol for autonomous agents on Solana. A wallet owner defines a bounded mandate (spending caps, allowed action, approved recipient, expiry). The agent receives a temporary session key that can act only inside that mandate. The owner's private key never reaches the agent or the server.

> **Status: Devnet prototype.** The web app, database and API are working. The onchain program that enforces mandates is still under development (see [Project status](#project-status)). Until it ships, limit checks in the UI are a preview, not enforcement. Do not use real funds.

---

## Table of contents

- [How it works](#how-it-works)
- [Project status](#project-status)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [API](#api)
- [Database](#database)
- [Security model](#security-model)
- [Onchain program](#onchain-program)
- [Demo scenario](#demo-scenario)
- [Code conventions](#code-conventions)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## How it works

1. The owner connects Phantom or Solflare and creates a **vault** (a program-derived address that holds funds).
2. The owner creates a **mandate** for an agent's **session key**: max amount per action, max total budget, allowed action (`SWAP` or `TRANSFER`), approved venue or recipient, and an expiry.
3. The agent signs only with its session key. Every execution is checked against the mandate before funds move.
4. The owner can **revoke** the session or **withdraw** funds at any moment.

```
Owner wallet ──creates──▶ Vault PDA ──holds──▶ funds
      │
      └──grants──▶ Mandate ──bounds──▶ Session key (agent)
                                            │
                       Build → Verify → Simulate → Execute
```

---

## Project status

| Area | Status |
|---|---|
| Landing page, docs pages, Builder playground (configurator, flow preview, code preview) | Done |
| Wallet connection (Phantom, Solflare) | Done |
| Neon database schema and migrations | Done |
| Signed-request API (vaults, mandates, revoke) and public receipts API | Done, verified by `pnpm api:smoke`. Not yet called by the UI |
| Transfer simulation on Devnet | Done. Simulates a plain SPL transfer from the connected wallet, not yet mandate-aware |
| Receipts feed | Done. Entries currently come from the demo seed script |
| Anchor program: vault, deposit, withdraw | Written, not yet compiled or tested |
| Anchor program: create mandate, revoke, execute with onchain limit checks | Next |
| Program test suite (demo scenarios 1 to 4) and Devnet deploy | Next |
| UI actions: create vault, deposit, create mandate, revoke, withdraw, mandate inspector | Planned |
| Agent runner and receipts recorded from verified onchain transactions | Planned |
| Swap via Meteora | Planned (last) |
| Optional LLM-driven agent reasoning (OpenRouter) | Not scheduled |

---

## Tech stack

- **Frontend / fullstack:** Next.js (App Router), React, TypeScript, Tailwind CSS v4, Lucide icons
- **Wallets:** `@solana/wallet-adapter-*` (Phantom, Solflare)
- **Solana client:** `@solana/web3.js` v1, `@solana/spl-token`
- **Database:** Neon (serverless PostgreSQL) via `@neondatabase/serverless`
- **Validation:** zod, shared between browser and server
- **Onchain:** Anchor 1.x (Rust), kept in a separate workspace
- **Tooling:** pnpm, ESLint, Prettier, tsx
- **Hosting target:** Vercel (web), Railway (background worker)

---

## Getting started

### Prerequisites

- Node.js `>= 20.9`
- pnpm (via Corepack: `corepack enable`)
- A [Neon](https://neon.com) project (free tier is enough)
- Phantom with **Testnet Mode** set to **Solana Devnet** (*Settings → Developer Settings*)

### 1. Install

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` (see [Environment variables](#environment-variables)).

### 2. Migrate the database

```bash
pnpm db:migrate
```

Migrations are checksummed. Editing an applied migration is rejected, so schema changes always go in a new file under `db/migrations/`.

### 3. Create the Devnet test token

The script creates a 6-decimal test token, funds it to your wallet, and prints the mint address. It uses a dev-only keypair stored in `.keys/` (gitignored).

```bash
pnpm mint:setup --to <YOUR_PHANTOM_ADDRESS>
```

The dev keypair needs a little Devnet SOL. If the airdrop is rate limited, send it some from Phantom or use <https://faucet.solana.com>. Copy the printed `NEXT_PUBLIC_TOKEN_MINT=...` line into `.env.local`.

### 4. (Optional) Seed demo receipts

```bash
pnpm db:seed
```

Sends one real Devnet transfer and records three receipts (one pass, two blocked).

### 5. Run

```bash
pnpm dev
```

Open <http://localhost:3000>.

### 6. Verify the API

With the dev server running, in a second terminal:

```bash
pnpm api:smoke
```

The smoke test uses throwaway wallets and exercises both normal flows and attacks (unsigned requests, replay, tampered body, stale signature, cross-path reuse, revoke by a stranger).

---

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_NETWORK` | public | `devnet` or `localnet` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | public | RPC endpoint. The CSP `connect-src` follows this value |
| `NEXT_PUBLIC_TOKEN_MINT` | public | Test token mint (from `pnpm mint:setup`) |
| `DATABASE_URL` | **server only** | Neon **pooled** connection string (host contains `-pooler`) |
| `DATABASE_MIGRATION_URL` | **server only** | Neon **direct** connection string, used by migrations and scripts |
| `APP_URL` | server only | App origin. Its host is bound into signed messages (anti-phishing). Set it per environment |
| `FYAT_PROGRAM_ID` | server only | Mandate program ID. Currently a placeholder (`1111…1111`) until the program is deployed |

Rules:

- Anything prefixed `NEXT_PUBLIC_` is visible in the browser. Never put secrets there.
- If an RPC URL contains an API key, restrict that key by origin at the provider. It is public by design.
- When `FYAT_PROGRAM_ID` changes, derived vault addresses change too. Reset dev data in the database and reseed.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier |
| `pnpm db:migrate` | Apply pending SQL migrations |
| `pnpm db:seed` | Record demo receipts (Devnet and development only) |
| `pnpm api:smoke` | End-to-end API checks, including attack cases |
| `pnpm mint:setup` | Create or reuse the Devnet test mint, optionally mint tokens to `--to <address>` |

---

## Project structure

```
.
├── db/migrations/          # Plain SQL, applied in filename order
├── scripts/                # migrate, seed, api-smoke, mint setup
├── public/brand/           # Logo
└── src/
    ├── app/                # Routing only: pages, API routes, metadata
    │   ├── api/            # vaults, mandates, receipts
    │   ├── builder/        # Builder page
    │   └── docs/           # Docs pages
    ├── components/
    │   ├── ui/             # Generic primitives (Button, Card, Tabs, forms)
    │   └── layout/         # Header, Footer, Section, Container
    ├── features/           # One folder per feature, public API via index.ts
    │   ├── builder/        # Mandate form, policy engine, flow, snippets, simulation
    │   ├── wallet/         # Provider, connect button, account menu
    │   ├── receipts/       # Feed, table, client API
    │   ├── hero/ platform/ protocol/ execution/ comparison/ developers/ docs/ cta/
    ├── hooks/              # Shared React hooks
    ├── lib/                # Pure helpers: env, amounts, Solana, auth message, vault address
    └── server/             # Server-only code (guarded by `server-only`)
        ├── api/            # Handler wrapper, errors, request parsing, serializers, cursors
        ├── auth/           # Wallet signature verification
        ├── db/             # Neon client and mappers
        ├── repositories/   # SQL access, one file per table group
        ├── security/       # Rate limiting, client IP
        ├── services/       # Read models for pages
        └── solana/         # Server-side address derivation
```

---

## API

Mutating endpoints require a wallet signature. Reads are public.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/vaults` | signed | Register the caller's vault (idempotent) |
| `POST` | `/api/mandates` | signed | Create a mandate under the caller's vault |
| `POST` | `/api/mandates/{id}/revoke` | signed | Revoke a mandate (owner only) |
| `GET` | `/api/receipts?limit=&cursor=` | public | Paginated receipts feed (cursor-based) |

There is intentionally **no public endpoint for writing receipts**. Receipts are written by server code after a transaction is verified.

### Signed requests

Each mutating request carries four headers and a JSON body:

| Header | Meaning |
|---|---|
| `x-fyat-wallet` | Owner public key |
| `x-fyat-signature` | Base64 Ed25519 signature of the message below |
| `x-fyat-nonce` | 16 random bytes, hex |
| `x-fyat-issued-at` | ISO-8601 UTC timestamp with milliseconds |

The server rebuilds the message itself (`src/lib/auth-message.ts`), so the client cannot influence its format:

```
FYAT Agent: authorize this request

Domain: <APP_URL host>
Wallet: <owner>
Request: <METHOD> <path>
Body SHA-256: <hash of the raw body>
Nonce: <nonce>
Issued At: <timestamp>

Sign only if you started this action on the site above.
```

This binds a signature to one site, one endpoint, one body, one moment, and one use.

### Errors

Errors share one shape and never leak internals:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "…", "issues": [] } }
```

Unexpected failures return `INTERNAL_ERROR` with a `requestId`. The details stay in server logs.

---

## Database

PostgreSQL on Neon. Key points (full definitions in `db/migrations/`):

| Table | Purpose |
|---|---|
| `vaults` | Registered vaults: owner, vault PDA, token mint |
| `mandates` | Session permissions: caps, budget, spent, expiry, `revoked_at` |
| `mandate_receipts` | Public audit tape. **Append-only** (enforced by trigger) |
| `auth_nonces` | Used signature nonces (replay protection) |
| `rate_limit_hits` | Counters for database-backed rate limiting |
| `schema_migrations` | Applied migrations with checksums |

Integrity is enforced in the database, not only in application code:

- Amounts are `NUMERIC(20,0)` constrained to the `u64` range. In code they are `bigint`, in JSON they are strings. Never `number`.
- Addresses and signatures use Base58-checked domains.
- `max_amount_per_action <= max_total_budget` and `current_spent <= max_total_budget` are `CHECK` constraints.
- Mandate terms are immutable after creation. Only `current_spent` (increase only) and `revoked_at` (set once) may change.
- Vault balance is **not** stored. The authoritative balance lives onchain.

---

## Security model

What is in place today:

- **No secrets in the browser.** The app only reads public keys from the wallet.
- **Wallet-signed mutations.** No sessions, cookies or tokens to steal, and no CSRF surface.
- **Replay protection.** Nonces are stored in the database. Signatures expire after five minutes.
- **Server-derived identity and addresses.** The vault PDA is derived on the server from the proven wallet, never taken from client input.
- **Same validation on both sides.** The browser form and the API share one zod schema.
- **Ownership checked inside SQL** for revoke, not only in route code.
- **Rate limiting** on every endpoint, backed by the database so it works across serverless instances.
- **Strict response headers.** CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- **No `dangerouslySetInnerHTML`.** Untrusted text (log lines, receipt reasons) renders as plain text.
- **Server-only modules** are marked with `import "server-only"`, so importing them from client code fails the build.
- **No third-party font or stylesheet requests.** Fonts are self-hosted through `next/font`.

What does **not** exist yet:

- Onchain enforcement of mandates (the core guarantee of the product).
- Verification that a registered vault exists onchain before saving it.
- Automated tests and CI.
- A nonce-based CSP. The current policy allows inline scripts for Next.js bootstrapping.
- An independent security audit. Required before any mainnet use.

Report vulnerabilities privately to the maintainers. Do not open public issues for them.

---

## Onchain program

The program lives in a **separate Anchor workspace** (`fyat_mandate`), developed in WSL on Windows because Rust builds on `/mnt/c` are very slow. The web app consumes its generated IDL and types.

Design (current and planned instructions):

| Instruction | Signer | Purpose | State |
|---|---|---|---|
| `initialize_vault` | owner | Create the vault PDA and its token account | Written |
| `deposit` | owner | Move tokens from the owner into the vault | Written |
| `withdraw` | owner | Move tokens from the vault to the owner's own token account. Independent of mandates | Written |
| `create_mandate` | owner | Register a session key with caps, recipient and expiry | Planned |
| `revoke_mandate` | owner | Cut off a session immediately | Planned |
| `execute_transfer` | session key | Transfer within the mandate. Checks cap, budget, recipient, expiry, revocation | Planned |

Decisions worth knowing:

- Vault PDA seeds are `["vault", owner, mint]`. They must stay identical to `src/lib/vault-address.ts`.
- Classic SPL Token only. Token-2022 extensions (transfer fees, hooks) could break accounting.
- Withdraw can only go to a token account owned by the owner, so a hijacked frontend cannot redirect funds.
- Checked arithmetic everywhere. No `unwrap` in program code.
- Upgrade authority must be a multisig, or removed, before any mainnet deployment.

---

## Demo scenario

The target end-to-end demo (needs the onchain program):

1. Owner connects Phantom on Devnet, creates a vault, deposits 20 test tokens.
2. Owner creates a mandate: max 5 per action.
3. **Normal execution.** The agent transfers 3 and it succeeds, visible on the Devnet Explorer.
4. **Policy blocked.** The agent tries 10 and the program rejects it.
5. **Theft prevention.** The agent tries to send to its own wallet and the program rejects it.
6. **Instant revoke.** The owner revokes the session and the agent loses all rights immediately.

Steps 3 to 5 can already be previewed in the Builder playground. There the checks run locally, not onchain.

---

## Code conventions

- **Feature folders.** Each feature owns its components, hooks, data and types. Other features import only from its `index.ts`.
- **Routes stay thin.** Pages and API routes compose. Logic lives in features, `lib/` and `server/`.
- **Pure logic is separate from UI.** Policy, flow, snippets and amount handling are plain functions without React, which keeps them testable and reusable on the server.
- **Money is never a float.** User input is parsed from strings to `bigint` base units.
- **One validation schema per concept**, shared by form and API. The server never trusts client-parsed values.
- **Content outside components.** Copy and lists live in `data.ts` files.
- **Accessibility is part of done.** Visible focus, labelled controls, ARIA live regions for status changes, reduced-motion support.
- **Migrations are append-only.** Never edit an applied migration.
- **Run before pushing:** `pnpm typecheck && pnpm lint`.

---

## Known limitations

- Limit checks in the UI are a preview. Enforcement arrives with the onchain program.
- The simulation tests a plain token transfer from the connected wallet. It does not exercise a mandate.
- Swap simulation and execution are not implemented.
- Receipt entries are currently demo data. Rows marked as passing link to real Devnet transactions, but no program enforced their mandate.
- The public Devnet RPC is rate limited. Use a dedicated provider for sustained testing.
- The `@fyat/sdk` package shown in code snippets does not exist yet. The snippets are illustrative and say so.
- IP-based rate limiting is only reliable behind a proxy that sets the client IP header (for example Vercel).

---

## Roadmap

1. Anchor program: mandates, revoke, execute, with onchain limit checks
2. Program tests for the demo scenarios and Devnet deployment
3. Browser `signedFetch` and a typed client generated from the IDL
4. UI for vault and mandate management, plus the mandate inspector
5. Agent runner and receipts recorded from verified transactions
6. Swap adapter (Meteora)
7. Test suite and CI, then deployment (Vercel and Railway)
8. Hardening before any mainnet use: nonce-based CSP, multisig upgrade authority, external audit

---

## License

To be decided by the project owners.
```
fyat-agent
├─ .prettierrc
├─ AGENTS.md
├─ db
│  └─ migrations
│     ├─ 0001_init.sql
│     └─ 0002_api_security.sql
├─ eslint.config.mjs
├─ fides_landing_mockup.html
├─ FYAT Agent.md
├─ next.config.ts
├─ onboarding_guide.md
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ postcss.config.mjs
├─ public
│  ├─ brand
│  │  └─ logo.jpeg
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ scripts
│  ├─ api-smoke.ts
│  ├─ check-vault-parity.ts
│  ├─ devnet-e2e.ts
│  ├─ lib
│  │  └─ dev-payer.ts
│  ├─ migrate.ts
│  ├─ seed-demo.ts
│  └─ setup-test-mint.ts
├─ src
│  ├─ app
│  │  ├─ api
│  │  │  ├─ mandates
│  │  │  │  ├─ route.ts
│  │  │  │  └─ [id]
│  │  │  │     └─ revoke
│  │  │  │        └─ route.ts
│  │  │  ├─ receipts
│  │  │  │  └─ route.ts
│  │  │  └─ vaults
│  │  │     └─ route.ts
│  │  ├─ docs
│  │  │  ├─ page.tsx
│  │  │  └─ [slug]
│  │  │     └─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ icon.tsx
│  │  ├─ layout.tsx
│  │  ├─ opengraph-image.tsx
│  │  ├─ page.tsx
│  │  ├─ robots.ts
│  │  └─ sitemap.ts
│  ├─ components
│  │  ├─ layout
│  │  │  ├─ container.tsx
│  │  │  ├─ footer.tsx
│  │  │  ├─ header-shell.tsx
│  │  │  ├─ header.tsx
│  │  │  ├─ logo.tsx
│  │  │  ├─ mobile-nav.tsx
│  │  │  ├─ nav-menu.tsx
│  │  │  ├─ section.tsx
│  │  │  └─ tone-section.tsx
│  │  └─ ui
│  │     ├─ button.tsx
│  │     ├─ card.tsx
│  │     ├─ code-block.tsx
│  │     ├─ exec-heading.tsx
│  │     ├─ eyebrow.tsx
│  │     ├─ form-fields.tsx
│  │     ├─ reveal.tsx
│  │     ├─ section-heading.tsx
│  │     ├─ segmented-control.tsx
│  │     └─ tabs.tsx
│  ├─ features
│  │  ├─ comparison
│  │  │  ├─ components
│  │  │  │  └─ comparison-section.tsx
│  │  │  ├─ data.ts
│  │  │  ├─ index.ts
│  │  │  └─ types.ts
│  │  ├─ cta
│  │  │  ├─ components
│  │  │  │  └─ final-cta.tsx
│  │  │  └─ index.ts
│  │  ├─ developers
│  │  │  ├─ components
│  │  │  │  └─ developers-section.tsx
│  │  │  ├─ data.ts
│  │  │  └─ index.ts
│  │  ├─ docs
│  │  │  ├─ components
│  │  │  │  ├─ docs-callout.tsx
│  │  │  │  ├─ docs-code.tsx
│  │  │  │  ├─ docs-header.tsx
│  │  │  │  ├─ docs-heading.tsx
│  │  │  │  ├─ docs-pager.tsx
│  │  │  │  ├─ docs-shell.tsx
│  │  │  │  ├─ docs-sidebar.tsx
│  │  │  │  ├─ docs-title-card.tsx
│  │  │  │  └─ docs-toc.tsx
│  │  │  ├─ data.ts
│  │  │  └─ pages.ts
│  │  ├─ execution
│  │  │  ├─ components
│  │  │  │  ├─ before-after.tsx
│  │  │  │  ├─ execution-graph.tsx
│  │  │  │  ├─ receipt-preview.tsx
│  │  │  │  └─ security-grid.tsx
│  │  │  ├─ data.ts
│  │  │  └─ index.ts
│  │  ├─ hero
│  │  │  ├─ components
│  │  │  │  ├─ animated-counter.tsx
│  │  │  │  ├─ hero-orb.tsx
│  │  │  │  ├─ hero-section.tsx
│  │  │  │  ├─ hero-static.tsx
│  │  │  │  ├─ hero-stats.tsx
│  │  │  │  └─ network-badge.tsx
│  │  │  ├─ index.ts
│  │  │  ├─ story
│  │  │  │  ├─ components
│  │  │  │  │  ├─ count-up.tsx
│  │  │  │  │  ├─ hero-story.tsx
│  │  │  │  │  ├─ node-field.tsx
│  │  │  │  │  ├─ node-tooltip.tsx
│  │  │  │  │  ├─ stats-strip.tsx
│  │  │  │  │  └─ story-copy.tsx
│  │  │  │  ├─ config.ts
│  │  │  │  ├─ data.ts
│  │  │  │  ├─ math.ts
│  │  │  │  ├─ particles.ts
│  │  │  │  ├─ phases.ts
│  │  │  │  ├─ render-particles.ts
│  │  │  │  └─ use-hero-story.ts
│  │  │  └─ types.ts
│  │  ├─ platform
│  │  │  ├─ components
│  │  │  │  ├─ aurora-background.tsx
│  │  │  │  ├─ feature-card-stage.tsx
│  │  │  │  ├─ feature-row.tsx
│  │  │  │  ├─ feature-tabs.tsx
│  │  │  │  └─ platform-section.tsx
│  │  │  ├─ data.ts
│  │  │  ├─ hooks
│  │  │  │  ├─ use-feature-preview.ts
│  │  │  │  └─ use-slide-intro.ts
│  │  │  ├─ index.ts
│  │  │  └─ types.ts
│  │  ├─ protocol
│  │  │  ├─ components
│  │  │  │  └─ protocol-section.tsx
│  │  │  ├─ data.ts
│  │  │  ├─ index.ts
│  │  │  └─ types.ts
│  │  ├─ receipts
│  │  │  ├─ api.ts
│  │  │  ├─ components
│  │  │  │  ├─ receipts-feed.tsx
│  │  │  │  ├─ receipts-panel.tsx
│  │  │  │  ├─ receipts-section.tsx
│  │  │  │  ├─ receipts-status-badge.tsx
│  │  │  │  └─ receipts-table.tsx
│  │  │  ├─ constants.ts
│  │  │  ├─ index.ts
│  │  │  └─ types.ts
│  │  └─ wallet
│  │     ├─ components
│  │     │  ├─ connect-wallet-button.tsx
│  │     │  ├─ solana-provider.tsx
│  │     │  └─ wallet-menu.tsx
│  │     ├─ hooks
│  │     │  └─ use-is-client.ts
│  │     ├─ index.ts
│  │     └─ wallet-modal.css
│  ├─ hooks
│  │  ├─ use-copy-to-clipboard.ts
│  │  ├─ use-in-view.ts
│  │  ├─ use-prefers-reduced-motion.ts
│  │  └─ use-reveal.ts
│  ├─ lib
│  │  ├─ amount.ts
│  │  ├─ async.ts
│  │  ├─ auth-message.ts
│  │  ├─ brand-image.ts
│  │  ├─ cn.ts
│  │  ├─ env.ts
│  │  ├─ fonts.ts
│  │  ├─ format.ts
│  │  ├─ idl
│  │  │  └─ fyat_mandate.json
│  │  ├─ site-url.ts
│  │  ├─ site.ts
│  │  ├─ solana.ts
│  │  └─ vault-address.ts
│  └─ server
│     ├─ api
│     │  ├─ cursor.ts
│     │  ├─ errors.ts
│     │  ├─ handler.ts
│     │  ├─ request.ts
│     │  ├─ schemas.ts
│     │  └─ serializers.ts
│     ├─ auth
│     │  ├─ authenticate.ts
│     │  ├─ ed25519.ts
│     │  └─ signed-request.ts
│     ├─ db
│     │  ├─ client.ts
│     │  └─ mappers.ts
│     ├─ env.ts
│     ├─ models.ts
│     ├─ repositories
│     │  ├─ auth-nonces.ts
│     │  ├─ maintenance.ts
│     │  ├─ mandates.ts
│     │  ├─ rate-limits.ts
│     │  ├─ receipts.ts
│     │  └─ vaults.ts
│     ├─ security
│     │  ├─ client-ip.ts
│     │  └─ rate-limit.ts
│     ├─ services
│     │  ├─ public-stats.ts
│     │  └─ receipt-feed.ts
│     └─ solana
│        └─ vault-address.ts
├─ tsconfig.json
└─ __MACOSX
   ├─ ._fides_landing_mockup.html
   ├─ ._FYAT Agent.md
   ├─ ._logo.jpeg
   └─ ._onboarding_guide.md

```