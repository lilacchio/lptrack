# 00 — Product Overview

## What LP Arena is

A Solana-native PvP tournament platform for Meteora LPs. Players compete on real LP performance over bounded seasons (1h / 24h / 7d). LP Agent's native-denominated P&L data (`dprNative`, `pnlNative`, `revenue` endpoint) scores the live leaderboard. Zap In is the entry mechanism; Zap Out is the exit. An on-chain Anchor program escrows entry fees into a prize pot that's distributed to top finishers after an off-chain scorer posts signed results.

## Who it's for

1. **Competitors** — existing Meteora LPs who want to prove their skill and win a pot.
2. **Creators** — top-ranked wallets (via LP Agent's `top-lpers` Premium endpoint) who open public challenges and earn from their followers competing against them.
3. **Spectators** — non-LPs who place small parimutuel wagers on predicted winners; onboarded via Privy embedded wallets (email login, no crypto literacy required).

## Core user stories

1. Alice sees a "SOL/USDC – 24h – 0.5 SOL entry – 64 slots" arena. She Zap-Ins from SOL only, picks a bin range, and enters. The app shows her live rank updating every 60s in SOL-denominated return.
2. Bob is the #3 wallet on LP Agent's `top-lpers` leaderboard for the JUP/SOL pool. He opens a "Beat me in 7 days" challenge. 40 followers enter. Winners split the pot; Bob earns a creator fee if he finishes top-5.
3. Carol doesn't LP. She logs in with Gmail (Privy), sees the live arenas, and wagers 0.05 SOL on Bob winning the JUP/SOL challenge. If Bob wins, she gets her share of the spectator pool.
4. A memecoin arena triggers its safety circuit breaker: the pool's `organic_score` drops below threshold mid-season. The arena auto-cancels; all entrants Zap-Out via the refund path; wagers are voided.

## Winning mechanics

- **Scoring metric**: default `dprNative` — SOL-denominated daily percentage return from LP Agent's `/lp-positions/opening`. Alternatives (`pnlNative`, `roiNative`) available per-arena.
- **SOL-denomination is non-negotiable**: USD-denominated scoring lets players win by picking pools whose quote token pumped. SOL-denominated scoring means you only win if you *actually out-LP the benchmark*.
- **Prize split**: default 50/30/20 to top 3; configurable up to 10 winners.
- **Ties**: broken by earlier entry time, then by bin range tightness (narrower = better).
- **Elo per wallet** updates after each arena; persistent PDA (`PlayerStats`).

## The rubric, mapped

| Criterion | Weight | How LP Arena scores |
|---|---|---|
| Requirements fulfillment | 40% | Zap In = entry, Zap Out = exit. Uses 8+ LP Agent endpoints. |
| Quality of LP Agent use | 20% | Scoring IS LP Agent data — `dprNative`/`pnlNative` literally decide winners. Uses Premium `top-lpers` for creator gating. |
| Creativity & UX | 30% | Interactive game. Live leaderboard. cNFT trophies. Spectator wagers. AI-guided entry. |
| Innovation | 10% | LPing-as-a-sport is a new primitive. Nobody shipped this. |

## What we are NOT building (scope guards)

- Not another auto-rebalancer (HawkFi/Hawksight own that).
- Not an LP dashboard (LP Agent's own homepage does this).
- Not a Discord/TG bot as the primary surface.
- Not a chatbot. AI is used for **inline assistance** (explaining bin ranges, rivalry summaries) — not as the app.
- Not cross-DEX. Meteora-only, aligned with LP Agent's coverage.

## Success criteria for demo day

- 50+ real wallets have entered at least one live devnet arena before submission.
- 3 live arenas visible on the landing page at demo time.
- 90-second screen recording: onboard → enter arena → watch rank change → claim payout.
- MCP bolt-on demo: Claude Desktop enters an arena via Swig session key in a single user message.
- Twitter share card generated per player result (viral loop).
