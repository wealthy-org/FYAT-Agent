# FYAT Agent

**Give agents execution rights, not your private key.**

FYAT Agent is a transaction builder and mandate protocol for autonomous agents on Solana. A wallet owner defines a bounded mandate (spending caps, allowed action, approved recipient, expiry). The agent receives a temporary session key that can act only inside that mandate. The owner's private key never reaches the agent or the server.

> **Status: Devnet prototype.** The onchain program enforces mandates (per-action cap, total budget, approved recipient, expiry, instant revoke) and is covered by tests and a Devnet end-to-end run. An agent runner (CLI) can hold its own session key and execute without the owner. It is triggered manually, so this is not yet a fully autonomous agent. Do not use real funds.

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
| Landing page, docs pages, Builder playground | Done |
| Wallet connection (Phantom, Solflare) | Done |
| Neon database schema and migrations | Done |
| Signed-request API (vaults, mandates, revoke) and receipts API | Done, called by the UI. `POST /api/vaults` verifies the vault onchain before saving |
| Anchor program: vault, deposit, withdraw, create mandate, revoke, execute transfer | Done. 32 LiteSVM tests pass |
| Devnet deployment and end-to-end flow | Done. Create vault, create mandate, execute, rejected execute, revoke |
| UI: vault, deposit, withdraw, create mandate, mandate inspector, revoke, execute | Done |
| Session key handling | Two modes: demo (key encrypted in the browser, owner approves each execution) or agent (key held by the agent runner, owner never signs executions) |
| Agent runner (CLI) with its own session key, receipts written automatically | Done. Triggered manually from a terminal. No scheduler or job queue yet |
| Swap (`Action::Swap`) | Not built. The program only supports `Transfer` |
| CI and automated web tests | Not built |

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
| `FYAT_PROGRAM_ID` | server only | Deployed Devnet program ID of `fyat_mandate`. Vault and mandate addresses are derived from it |
| `SOLANA_RPC_URL` | server only, optional | RPC used by scripts. Falls back to `NEXT_PUBLIC_SOLANA_RPC_URL` |
| `AGENT_SECRET_KEY` | **server only, secret** | JSON array of the agent's secret key, for running the agent runner on a server. Locally the runner reads `.keys/agent.json` |

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
| `pnpm e2e:devnet` | Run the four demo scenarios against the deployed Devnet program |
| `pnpm agent:keygen` | Create the agent keypair in `.keys/agent.json` and print its public key |
| `pnpm agent:run --mandate <PDA> --amount <n> [--to <wallet>]` | Agent signs `execute_transfer` with its own key and records the receipt |

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
| `POST` | `/api/mandates/{id}/execute` | signed | Verify an executed transaction onchain and record its receipt (demo mode) |
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

- Automated web tests and CI.
- A nonce-based CSP. The current policy allows inline scripts for Next.js bootstrapping.
- An independent security audit. Required before any mainnet use.

Report vulnerabilities privately to the maintainers. Do not open public issues for them.

---

## Onchain program

The program lives in a **separate Anchor workspace** (`fyat_mandate`), developed in WSL on Windows because Rust builds on `/mnt/c` are very slow. The web app consumes its generated IDL (`src/lib/idl/fyat_mandate.json`).

| Instruction | Signer | Purpose |
|---|---|---|
| `initialize_vault` | owner | Create the vault PDA and its token account |
| `deposit` | owner | Move tokens from the owner into the vault |
| `withdraw` | owner | Move tokens to the owner's own token account. Independent of mandates |
| `create_mandate` | owner | Register a session key with per-action cap, total budget, one approved recipient and an expiry (max 30 days) |
| `revoke_mandate` | owner | Cut off a session immediately. Can only happen once |
| `execute_transfer` | session key | Transfer within the mandate. Checks signer, revocation, expiry, per-action cap, remaining budget and recipient |

Decisions worth knowing:

- Vault PDA seeds are `["vault", owner, mint]`. Mandate seeds are `["mandate", vault, id (u64 LE)]`. The vault seeds must stay identical to `src/lib/vault-address.ts`. A shared test vector checks this on both sides (`tests/pda_parity.rs` and `scripts/check-vault-parity.ts`).
- The destination token account must be owned by the mandate's recipient, so an agent cannot send funds to its own wallet.
- The recipient cannot be the session key or the vault, and the session key cannot be the owner.
- Withdraw can only go to a token account owned by the owner.
- Classic SPL Token only. Token-2022 extensions could break accounting.
- Checked arithmetic everywhere. Error codes are stable: new variants are only appended.
- Upgrade authority must be a multisig, or removed, before any mainnet deployment.

### Running the program tests

Tests use LiteSVM, with no validator needed. They load `target/deploy/fyat_mandate.so`, which must be built as SBPF **v0**, because LiteSVM 0.10 rejects v3 binaries:

```bash
cargo build-sbf --arch v0 --manifest-path programs/fyat_mandate/Cargo.toml
cargo test -p fyat_mandate
```

`anchor build` overwrites the binary with a v3 build. Rebuild with `--arch v0` before running tests again.

## Demo scenario

1. Owner connects Phantom on Devnet, creates a vault, deposits test tokens.
2. Owner creates a mandate: max 5 per action, with an approved recipient.
3. **Normal execution.** The agent transfers 3 and it succeeds, visible on the Devnet Explorer.
4. **Policy blocked.** The agent tries 10 and the program rejects it (`ExceedsPerActionLimit`).
5. **Theft prevention.** The agent tries to send to its own wallet and the program rejects it (`DestinationNotAllowed`).
6. **Instant revoke.** The owner revokes the session and the next execution is rejected (`MandateIsRevoked`).

Each scenario is enforced by the program, not the UI. The same scenarios run in the test suite:

| Scenario | Test |
|---|---|
| Transfer within the cap succeeds | `demo_1_transfer_within_the_cap_succeeds` |
| Transfer above the cap is rejected | `demo_2_transfer_above_the_cap_is_rejected_by_the_program` |
| Send to the agent's own wallet is rejected | `demo_3_sending_to_the_agents_own_wallet_is_rejected` |
| Revoke takes effect immediately | `demo_4_revoke_takes_effect_immediately` |

The suite also covers the total budget ceiling, exact expiry boundary, wrong signer, double revoke, non-owner actions and every invalid mandate parameter.

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

- **Demo session model.** The session key is generated in the owner's browser and stored encrypted with a passphrase. The owner still approves each execution in the UI. This proves that the program enforces the limits, but it is not yet an autonomous agent.
- The policy simulation in the Builder is a local preview. The binding limits are the ones enforced by the program.
- Only `Action::Transfer` exists onchain. Swap is not implemented.
- Receipts are recorded from real Devnet transactions made through the UI. `pnpm db:seed` still creates demo entries.
- Devnet only. The public Devnet RPC is rate limited, so use a dedicated provider for sustained testing.
- The `@fyat/sdk` package shown in code snippets does not exist yet. The snippets are illustrative and say so.
- IP-based rate limiting is only reliable behind a proxy that sets the client IP header (for example Vercel).
- No automated web tests or CI yet. The program has its own test suite.

## Roadmap

1. Agent runner that holds the session key and executes without the owner in the browser, with receipts recorded from verified transactions
2. `Action::Swap` (Meteora adapter), with program tests first
3. Browser `signedFetch` and a typed client generated from the IDL
4. Web test suite and CI, then deployment (Vercel and Railway)
5. Hardening before any mainnet use: nonce-based CSP, multisig upgrade authority, external audit

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