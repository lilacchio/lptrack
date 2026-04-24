# LP Arena — Build Checklist

5 phases, ~4 weeks. Tick items as you go. Don't start a phase until the prior phase's **exit criteria** are met.

---

## Phase 0 — Foundations (2 days)

- [x] Install toolchain: Rust 1.95, Solana 1.18.26, avm 1.0.1, anchor 0.30.1, pnpm 9.12.0, Node 20.20.2. (WSL Ubuntu) — **NOTE: Solana 1.18 platform-tools ship rustc 1.75, too old for modern `edition2024` transitive deps. Need to upgrade to Agave 2.x before `anchor build` will work.**
- [x] `solana-keygen new` — admin pubkey `2eXVwmqhWd8cC5tDydrtHL41z4qPv2jseXi53FXKSVUf`.
- [x] `solana config set -u devnet`. Airdrop rate-limited on both public devnet + Helius → funding manually via faucet.solana.com.
- [x] Create monorepo workspace. Root `package.json` with `pnpm-workspace.yaml` covering `app`, `services/*`, `mcp`, `programs/lp-arena`.
- [x] Commit initial scaffold. `.gitignore` for `target/`, `.anchor/`, `node_modules/`, `.env*`.
- [x] Create Supabase project (free). Save URL + anon + service keys. **(verified HTTP 200)**
- [x] Create Helius free account. Note devnet RPC URL. **(verified getHealth=ok)**
- [x] Create Privy app (free dev tier). Note app ID.
- [x] Confirm LP Agent Premium key works: `curl -H "x-api-key: $K" https://api.lpagent.io/open-api/v1/pools/discover?pageSize=1` **(HTTP 200)**
- [x] Download `https://docs.lpagent.io/llms.txt` → `specs/ref/lpagent-llms.txt` (offline reference).
- [x] Generate Ed25519 keypair for scoring oracle. Pubkey `E38yZp8haefXLLoUotTXu6VLWsHBjbkPanvuKTbrcRj4`, path `./keypairs/scoring-oracle.json`. Protocol fee vault pubkey `AmKaqUxbmRGV9a9EaNEaHp2QAUh1kbSU9NJZoE1NAdx2`.
- [x] Admin wallet funded via faucet.solana.com — **10 SOL on devnet**.
- [x] Generate program keypair. Program ID `Hrto23usPNyEYdmpVCVppM37M7vyBFd1sFhfRtTFGEc4`. Synced into `programs/lp-arena/src/lib.rs` (`declare_id!`) and `Anchor.toml` (devnet + localnet).
- [ ] **BLOCKED**: `anchor build` fails — Solana 1.18's rustc 1.75 can't parse `edition2024` in transitive crates (`block-buffer 0.12`). WSL also crashed mid-diagnosis with `Wsl/Service/CreateInstance/E_FAIL`. **Action: reboot Windows, then `agave-install init 2.0.x` (or later) to get newer platform-tools, then retry `anchor build`.**

**Exit criteria**: `anchor build` succeeds on the sketch; Supabase + Helius + LP Agent credentials all verified with one curl each.

---

## Phase 1 — Anchor program (Week 1)

Reference spec: `specs/01-anchor-program.md`.

- [ ] Copy program sketch into `programs/lp-arena/src/`. Replace program ID with `anchor keys list` output.
- [ ] Implement all 9 instructions. Start with `initialize_config`, `create_arena`, `enter_arena` (happy path only).
- [ ] Implement Ed25519 sigverify helper (`verify_oracle_signature`). Most failure-prone part — allocate time.
- [ ] Implement `settle_arena`, `claim_payout`, `cancel_arena`, `claim_refund`.
- [ ] Implement `place_wager` (can defer claim_wager to Phase 3).
- [ ] Implement `update_player_stats` with `init_if_needed`.
- [ ] Write all 7 Anchor test suites (`specs/06-testing.md`). Use `anchor-bankrun` for Clock mocking.
- [ ] Get anchor test coverage ≥ 90%.
- [ ] `anchor deploy --provider.cluster devnet`. Verify program is on devnet explorer.
- [ ] Initialize config on devnet: `scripts/init-config.ts` calling `initialize_config` with oracle pubkey + 200 bps protocol fee.
- [ ] Create test arena: `scripts/create-test-arena.ts` — sets a 10-minute arena on SOL/USDC for manual testing.

**Exit criteria**: a developer can run `scripts/full-flow.ts` which creates an arena, enters 4 wallets, waits for end_ts, settles with a locally-signed payload, and verifies winners can claim. All on devnet.

---

## Phase 2 — Frontend + LP Agent integration (Week 2)

Reference specs: `specs/02-lp-agent-integration.md`, `specs/03-architecture.md`, `specs/04-ui-guidelines.md`.

### Scaffolding
- [ ] `cd app && pnpm create next-app .` — App Router, TypeScript, Tailwind, shadcn.
- [ ] Install: `@solana/wallet-adapter-react`, `@solana/wallet-adapter-wallets`, `@solana/web3.js`, `@privy-io/react-auth`, `@tanstack/react-query`, `zustand`, `framer-motion`, `@visx/*`, `lucide-react`, `@coral-xyz/anchor`.
- [ ] Copy Anchor IDL into `app/lib/idl/lp_arena.json`. Type-generate with `anchor idl type`.
- [ ] Theming: `tailwind.config.ts` with the 4 arena theme accent colors (emerald/orange/sky/violet). Dark mode default `system`.
- [ ] Fonts: Inter Tight via `next/font`. Mono: JetBrains Mono.
- [ ] shadcn base components: button, card, dialog, tabs, tooltip, badge, toast, command.

### Data + Supabase
- [ ] DB schema (`services/scoring/supabase/migrations/001_init.sql`):
  - `arenas` (pubkey, pool, state, timestamps, theme, accent, …)
  - `entries` (arena_pubkey, player_pubkey, zap_in_sig, final_rank, …)
  - `leaderboard` (arena_pubkey, player_pubkey, score, rank, updated_at) — realtime-enabled
  - `player_stats_cache` (pubkey, elo, arenas_played, …)
  - `wagers` (arena_pubkey, spectator_pubkey, predicted_winner, amount, …)
- [ ] Apply migrations to Supabase project.
- [ ] Next.js API routes: `/api/arenas`, `/api/arenas/[pubkey]`, `/api/leaderboard/[pubkey]`, `/api/me`. All server-side; never expose service key to client.

### LP Agent client
- [ ] `services/lib/lpagent.ts` — typed client covering 15 endpoints (see `specs/02`).
- [ ] Unit tests for client methods against recorded fixtures (MSW or `node-fetch`-mockable).

### Core pages
- [ ] `/` — arena grid (`<ArenaCard />` components). SSR from Supabase.
- [ ] `/arena/[pubkey]` — detail page with left = `<LiveLeaderboard />` + `<BinChart />`, right = narrative + `<ArenaCountdown />`.
- [ ] `/arena/[pubkey]/enter` — Entry Wizard (3 steps). Hooks up to on-chain `enter_arena` then LP Agent Zap-In.
- [ ] `/profile/[pubkey]` — `<TrophyCase />`, Elo, arena history, equity curve (Recharts).
- [ ] `/not-connected` — wallet gate.

### Wallet integration
- [ ] Wallet provider wrapping app: Phantom + Solflare via wallet-adapter, Privy embedded for email login. Merged into one `useWallet()` hook via an adapter shim.
- [ ] On-chain tx helpers in `app/lib/chain/` — `enterArenaTx`, `claimPayoutTx`, `claimRefundTx`.
- [ ] Zap-In integration: call `/api/zap/in` (server proxies LP Agent with premium key), receive serialized txs, user signs, submit via `/api/zap/in/land`. Never expose `LPAGENT_API_KEY` client-side.
- [ ] Zap-Out integration analogous.

### Realtime
- [ ] Supabase Realtime subscription on leaderboard rows. `<LiveLeaderboard />` re-renders with layout animations on rank change.
- [ ] ArenaCountdown ticks via client-side setInterval + `framer-motion` number morph.

**Exit criteria**: a new user can connect Phantom, see live arenas, enter one, see themselves on the leaderboard (seeded with mock scoring), claim a payout after manual settlement.

---

## Phase 3 — Scoring service + AI layer (Week 3)

### Scoring service (`services/scoring`)
- [ ] Node/TS service. Entry: `services/scoring/src/index.ts`. Long-running with crons.
- [ ] 60s scoring tick (`services/scoring/src/ticks/leaderboard.ts`) — see pseudocode in `specs/02`.
- [ ] 30s safety watcher (`services/scoring/src/ticks/safety.ts`).
- [ ] Settlement cron on arena end (`services/scoring/src/ticks/settle.ts`) — builds + signs payload, constructs Solana tx with Ed25519 sigverify ix, submits.
- [ ] Elo update cron post-settlement (`services/scoring/src/ticks/elo.ts`).
- [ ] Deploy to Railway free tier. Set secrets. Verify running.

### AI layer (`services/ai`)
Reference spec: `specs/05-ai-ux.md`.
- [ ] Anthropic SDK setup (`@anthropic-ai/sdk`). Wrap in a client that always injects prompt-cached system prompts.
- [ ] Tool schemas for 4 structured outputs: `coach_suggestion`, `rival_summary`, `post_season_recap`, `safety_inspection`. Schemas in `services/ai/src/schemas.ts`.
- [ ] `/api/ai/coach` — given arena + player risk tolerance, return structured `coach_suggestion`.
- [ ] `/api/ai/rivals` — given arena + player, return structured `rival_summary`.
- [ ] `/api/ai/recap` — given completed arena + player, return structured `post_season_recap`.
- [ ] `/api/ai/safety` — given pool, return structured `safety_inspection`.
- [ ] UI: `<AiHint />` component consuming these. Renders in Entry Wizard, arena sidebar, post-season modal, memecoin arena warning.

### Creator arenas + spectator wagers
- [ ] Gating API: check wallet is in top-50 of `/pools/{id}/top-lpers`. If yes, unlock "Open a Challenge" CTA on profile page.
- [ ] "Open Challenge" flow → calls `create_arena` from user wallet (not admin). Requires a small creator bond (0.1 SOL) forfeited if under-subscribed.
- [ ] Wager UI on arena detail page — slider to pick predicted winner, amount, confirm.
- [ ] Wager settlement instruction added to program if not done in Phase 1.

### OG image + share
- [ ] `@vercel/og` endpoint `/og/arena/[pubkey]` — generates "I ranked #N — +X% in Y" card post-season.
- [ ] Add Twitter meta tags on profile pages and post-season modal.

**Exit criteria**: three live arenas running end-to-end in real time with AI Coach suggesting ranges, Rival Scout narrating moves, leaderboard updating, and safety watcher cancelling a mock-degraded pool in a scripted drill.

---

## Phase 4 — Polish + Playwright + load test (Week 4, days 1–4)

### Playwright
Reference spec: `specs/06-testing.md`.
- [ ] `app/playwright.config.ts` with local + CI projects, dark-mode snapshots.
- [ ] T1 normie signup, T2 power-user entry, T3 realtime leaderboard, T4 safety cancellation.
- [ ] GitHub Actions CI: anchor test + playwright test on every PR. Must be green.

### Content
- [ ] Landing page above-the-fold: headline "LPing is a sport now.", sub-headline, live arena grid below.
- [ ] Help/rules page (concise, Shopify-doc-style).
- [ ] FAQ page.
- [ ] `/about` — team, why LP Agent, why Meteora.

### Perf + polish
- [ ] Lighthouse ≥95 mobile on all pages. Preload fonts, lazy-load bin chart, use `next/image` for all imagery.
- [ ] Zero layout shift. Test with throttled 3G.
- [ ] All `aria-live` regions correct; keyboard nav through Entry Wizard.

### Pre-launch content
- [ ] Seed 6 live arenas (2 SOL/USDC, 2 JUP/SOL, 2 DBC-graduated memecoins with safety gates).
- [ ] Recruit 50+ devnet players (Meteora Discord, Superteam, friends).

**Exit criteria**: Lighthouse green, Playwright green, 50+ registered wallets, 3 live arenas ready for demo day.

---

## Phase 5 — MCP bolt-on + demo (Week 4, days 5–7)

Reference spec: `specs/05-ai-ux.md` section 5.

### MCP server (`mcp/`)
- [ ] `@modelcontextprotocol/sdk` scaffold.
- [ ] 6 tools: `list_arenas`, `arena_detail`, `suggest_range`, `enter_arena`, `my_positions`, `exit_arena`.
- [ ] Swig integration: scoped session key request (program IDs = LP Arena + LP Agent zap programs; amount cap 1 SOL; 24h expiry).
- [ ] Documentation: `mcp/README.md` with Claude Desktop setup instructions.
- [ ] Dogfood: use Claude Desktop to enter an arena end-to-end without the web UI. Video this.

### Demo video
- [ ] 90-second screen recording:
  - 0:00 – land on homepage, arena grid visible
  - 0:10 – sign in with email (Privy), 1 click
  - 0:20 – click SOL/USDC 24h arena
  - 0:30 – AI Coach suggests range; "Why?" expands the reasoning
  - 0:45 – Zap-In signs, position opens, leaderboard shows "You: rank 7"
  - 1:00 – time-skip to end of arena; rank 2 finish
  - 1:10 – AI recap shows what cost you first place
  - 1:20 – OG card auto-generated; Twitter share opens in background
  - 1:30 – bonus: show MCP doing the same flow from Claude Desktop
- [ ] Upload to YouTube unlisted. Embed on landing page.

### Submission artifacts
- [ ] GitHub repo public, README polished, architecture diagram embedded.
- [ ] Add `thanhlmm` as collaborator (LP Agent docs requirement) if repo is private.
- [ ] Deploy frontend to Vercel, custom subdomain via free tier.
- [ ] Demo URL working. Devnet program verified on explorer.
- [ ] Hackathon submission form: link to repo, demo URL, video, summary.

**Exit criteria**: demo works on a fresh browser with no prior state; video is on YouTube; submission form is filled; `thanhlmm` added to private repo if applicable.

---

## Risk register (monitor throughout)

| Risk | Mitigation |
|---|---|
| LP Agent rate-limits the Premium key | Polite polling (60s/entrant, 30s/pool). Back off on 429. Cache aggressively. |
| Ed25519 sigverify bug loses a day | Write the happy-path test first; bankrun + log-everything. |
| Meteora has no devnet pools at scale | Devnet for program only, mainnet read-only for LP Agent (see `specs/03`). Call out in demo script. |
| Nobody signs up in time | Personal outreach Week 3. Incentive: first 50 entrants get a free cNFT trophy. |
| Scoring oracle key leak | Separate keypair from admin. Never in repo. Rotate-able (admin can update `ArenaConfig`). |
| Settlement cron crashes mid-run | Idempotent: program rejects double-settle. Cron retries with backoff. |
| Anthropic API quota exhaustion | Cache aggressively. Graceful degrade (see `specs/05`). Budget $20 pre-paid. |

## Commands cheat-sheet

```bash
# Build + deploy program
anchor build
anchor deploy --provider.cluster devnet

# Run Anchor tests
anchor test

# Dev server (from repo root)
pnpm --filter app dev          # :3000
pnpm --filter scoring dev      # scoring cron
pnpm --filter mcp dev          # MCP server

# E2E
pnpm --filter app exec playwright test

# Full CI (matches GH Actions)
pnpm -r test
```
