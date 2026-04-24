# 03 — System Architecture

## Components (all free)

```
┌────────────────────────────┐      ┌────────────────────────────┐
│  Next.js 15 (Vercel free)  │◀────▶│  Supabase (free)           │
│  App Router + shadcn/ui    │      │  Postgres + Realtime       │
│  wallet-adapter + Privy    │      │  arenas, entries, scores   │
└────────────▲───────────────┘      └─────────────▲──────────────┘
             │                                    │
             │ (read: arena state + leaderboard)  │ (upserts from cron)
             │                                    │
             ▼                                    │
┌────────────────────────────┐      ┌────────────┴───────────────┐
│  Solana devnet             │◀─────│  Scoring service           │
│  lp_arena program          │      │  (Railway/Fly free tier)   │
│  Anchor accounts + vaults  │      │  Node.js + ts-node         │
└────────────▲───────────────┘      │  - 60s scoring tick        │
             │                       │  - 30s safety watcher     │
             │                       │  - settlement cron        │
             │                       │  - Elo update cron        │
             │                       └────────────▲──────────────┘
             │                                    │
             └──── settle_arena (Ed25519 signed) ─┘
                                                  │
                                                  ▼
                                    ┌────────────────────────────┐
                                    │  LP Agent API (Premium)    │
                                    │  api.lpagent.io/open-api   │
                                    └────────────────────────────┘
```

## Data flow: player entering an arena

1. User visits arena page → Next.js SSR reads arena row from Supabase.
2. User clicks "Enter." Frontend:
   a. Calls `GET /pools/{id}/info` for live bin chart.
   b. Opens Entry Wizard (AI Coach suggests bin range — see `05-ai-ux.md`).
   c. On submit: calls `enter_arena` ix on Solana devnet (pays entry fee in SOL).
   d. **Immediately after**: calls `POST /pools/{id}/add-tx` (LP Agent Zap In) with user's chosen bin range + deposit amount.
   e. User signs returned swap+addLiquidity txs; frontend submits via `POST /pools/landing-add-tx` (Jito bundle).
   f. Supabase row inserted: `(arena, player, entryTx, zapInSignature)`.
3. Scoring cron picks up the new entrant on next 60s tick.

## Data flow: settlement

1. End time reached → settlement cron fetches final scores.
2. Cron signs `SettlePayload` with oracle Ed25519 key.
3. Cron builds + submits Solana tx: `[ed25519_program::sigverify, lp_arena::settle_arena]`.
4. On confirmation: Supabase `arenas.state = 'Completed'`; realtime push to subscribed clients.
5. Winners see "Claim payout" CTA; losers see "Zap Out" CTA (voluntary exit — position is still theirs, the arena just stopped scoring).
6. Follow-up cron: for each entrant, invoke `update_player_stats`; emit OG-image generation job for each winner.

## Tech choices

| Layer | Pick | Why |
|---|---|---|
| FE framework | Next.js 15 App Router | default; Vercel free; SSR for SEO on arena pages |
| UI lib | shadcn/ui + Tailwind | free, copy-paste, matches restrained-minimalism spec |
| Charts | Recharts or **visx** | both free; visx for bin chart (custom viz), Recharts for equity curve |
| State | TanStack Query + Zustand | query = server state, zustand = wizard state |
| Wallet | `@solana/wallet-adapter-react` + Privy embedded | combined: power users bring Phantom; normies sign up with email |
| RPC | Helius devnet | 1M credits/mo free; enhanced APIs useful |
| Session keys | **Swig** | scoped keys for auto-exit at season end without prompting |
| DB | Supabase Postgres + Realtime | free tier 500MB + 2 realtime projects |
| Cache | Upstash Redis | free 10k commands/day |
| Backend | Railway (scoring service) | free tier is enough for hackathon cron |
| AI inference | **Claude Sonnet 4.6 via Anthropic API** | cheap ($3/$15 per M), prompt caching for the "AI Coach" system prompt |
| OG images | `@vercel/og` | free, serverless |
| MCP server | `@modelcontextprotocol/sdk` | free; Phase 5 bolt-on |
| Testing | Playwright + mocha/anchor test | free |

## Environment variables

`.env.local`:
```
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=...
NEXT_PUBLIC_PROGRAM_ID=<LPArena program id>
NEXT_PUBLIC_PRIVY_APP_ID=...
LPAGENT_API_KEY=<premium>
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...   # server only
SCORING_ORACLE_SECRET=...  # Ed25519 private key for on-chain verification (JSON array of 64 bytes)
ANTHROPIC_API_KEY=...
ADMIN_WALLET_SECRET=...    # keypair that calls cancel/settle crank
```

## Why devnet is fine for the demo

LP Agent's production API is mainnet. For the demo, we can't run real Meteora positions on devnet (no Meteora devnet pools at scale). **Resolution**: the on-chain program runs on devnet. The LP Agent integration points at mainnet read-only endpoints using throwaway mainnet wallets pre-funded for demo. In the demo script, we explicitly call this out: "the prize pot is on devnet, the LP position is on mainnet — this is a hackathon constraint and not an architecture issue."

Alternative: full mainnet deployment with small entry fees (0.01 SOL). Judge this call in Week 4 based on time/budget. Devnet is the safe default.
