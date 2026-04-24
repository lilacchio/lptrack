# 06 — Testing

Two test surfaces:
1. **Anchor program unit + integration tests** via `anchor test` (mocha + ts-mocha).
2. **End-to-end browser tests** via **Playwright**, driving a real browser against the deployed devnet program + a local Next.js dev server.

## Anchor tests

Path: `programs/lp-arena/tests/*.ts`.

### Suite 1 — `config.spec.ts`
- `initialize_config` creates PDA with correct admin/oracle/fee vault.
- Re-running fails (account already exists).

### Suite 2 — `arena.spec.ts`
- `create_arena` happy path. Check all fields persist, vault PDA derivable.
- Rejects invalid bps sum (winners > 10k bps).
- Rejects start ≥ end timestamps.
- Rejects min_entrants < 2.
- Enforces `config.paused`.

### Suite 3 — `entry.spec.ts`
- 4 distinct wallets each `enter_arena`. Check Entry PDAs, `current_entrant_count` ticks, `prize_vault` SOL balance = 4 × entry_fee.
- Duplicate-entry rejected.
- Entry before `entry_open_ts` rejected.
- Entry after `entry_close_ts` rejected.
- Entry when arena is full rejected (set max_entrants=2, try 3rd).

### Suite 4 — `settlement.spec.ts`
- Happy path: 4 entries, end_ts reached, construct signed payload, build tx with `[ed25519_program::sigverify, settle_arena]`, confirm. Check `winners` populated, `total_prize_pot` = pot − protocol_fee.
- Rejects: missing sigverify ix.
- Rejects: sigverify ix signs wrong pubkey.
- Rejects: payload tampered (change one score — signature fails).
- Rejects: arena not yet ended.
- Rejects: double settlement.

### Suite 5 — `payout.spec.ts`
- Each of top-3 claims. Balances on their wallets increase by the correct bps slice.
- 4th place `claim_payout` fails (NotInPrizePositions).
- Double-claim by 1st fails (PayoutAlreadyClaimed).

### Suite 6 — `refund.spec.ts`
- Arena with min_entrants=3, only 2 enter. Past entry_close_ts, anyone can call `cancel_arena(reason=0)`.
- Both entrants `claim_refund`; balances restored to (starting − gas).

### Suite 7 — `wager.spec.ts`
- Spectator places wager; wager_vault SOL ticks.
- Wager after entry_close_ts rejected.

Helpers live in `programs/lp-arena/tests/_util.ts`:
- `airdrop(pk, sol)`
- `buildSigverifyIx(oracleKp, message)` — mirrors the layout the program expects
- `signPayload(oracleKp, arena, payload)` — builds message bytes and signs
- `sleepUntil(ts)`  — spin until a wall-clock time; for time-dependent tests, prefer a mocked clock via `set_sysvar_clock` on the bankrun test env

**Use `anchor-bankrun` (a free Solana test runner) for deterministic Clock mocking.** Without it, tests would need real sleeps that blow out CI time.

## Playwright E2E

Path: `app/tests/e2e/*.spec.ts`. Config: `app/playwright.config.ts`.

Playwright is run headed for demo recording, headless for CI.

### Fixtures

- `authedPage`: spins up Next dev server + Privy test key; logs in via a deterministic test email.
- `mainnetWallet`: loads a burner keypair from `.env.test` pre-funded with tiny SOL (for Zap-In against mainnet pools — see `specs/03-architecture.md` on the devnet/mainnet split).
- `mockedLpAgent`: optional MSW-based interceptor that stubs `/api.lpagent.io/*` for deterministic UI tests without hitting real API.

### Scenarios

**T1 — Normie signup → arena browse**
- New user lands on `/`, sees 3 active arenas.
- Clicks "Join with email". Privy email flow, confirms code.
- Redirected to the arena grid, now with a wallet connected toast.

**T2 — Power user entry with Phantom mock**
- `playwright-wallet` plugin or manual injected provider mocking `window.solana`.
- Click "Enter" on an arena. Entry Wizard opens.
- Verify AI Coach card appears with a bin-range suggestion within 3s (mocked).
- Click "Apply". Confirm deposit.
- Wallet popup mocks an approve. Verify Zap-In tx is built (mock LP Agent `POST /pools/{id}/add-tx`).
- Verify UI transitions to "You're in — position #12" state within 5s.

**T3 — Leaderboard realtime**
- Enter an arena with 4 seeded entrants (fixture writes directly to Supabase).
- Manually push a leaderboard update through Supabase Realtime from a test client.
- Assert UI animates rank change within 500ms; assert ↑/↓ indicators render.

**T4 — Safety circuit-breaker cancellation**
- Arena page loaded. Fixture writes `arenas.state = 'Cancelled'` and pushes realtime event.
- Assert arena page flips to "Refund available" state and "Claim Refund" CTA is clickable.

**T5 — MCP end-to-end (Phase 5)**
- Scripted Claude Desktop via MCP testing harness sends: "enter me in SOL/USDC 24h arena with 0.5 SOL".
- Assert MCP server receives tool calls in order: `list_arenas`, `suggest_range`, `enter_arena`.
- Assert on-chain entry tx confirms within 30s.

**T6 — Visual regression (optional)**
- Use Playwright's `toHaveScreenshot()` on key pages (home, arena, profile) across light + dark mode.

### Running locally

```bash
pnpm i
pnpm --filter app dev &          # Next.js on :3000
pnpm --filter scoring dev &      # scoring cron on :4000 (mock mode)
pnpm --filter app exec playwright test
```

CI config: GitHub Actions, free. Uses `anchor-bankrun` for Anchor, headless Playwright for E2E. A single `pnpm test` at repo root runs both.

## What we do NOT test

- We do NOT test LP Agent's API itself — we trust the sponsor.
- We do NOT test Privy's auth flow end-to-end — we use their test key and assume auth works.
- We do NOT do load testing — hackathon demo, not production.
- We do NOT fuzz the Anchor program — time constraint; revisit post-hackathon if it advances.

## Coverage bar for submission

- Anchor program: ≥90% line coverage on `lib.rs`.
- Playwright: T1, T2, T3, T4 must pass headless. T5 can be manually demo'd.
- One "happy path" demo recording (mp4) must replay the core flow in < 90s.
