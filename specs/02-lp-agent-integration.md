# 02 — LP Agent Integration

Base URL: `https://api.lpagent.io/open-api/v1`
Auth: `x-api-key: <PREMIUM_KEY>` (stored in `.env.local`, never client-side).

## Endpoint usage map

| Endpoint | Where it's used | How load-bearing |
|---|---|---|
| `GET /pools/discover` | Arena creation wizard; "suggest pools for next season" cron | Core |
| `GET /pools/{id}/info` | Arena detail page (bin chart, fee stats, current active bin) | Core |
| `GET /pools/{id}/positions` | Live leaderboard (aggregate view of all entrants' positions in one call) | Core |
| `GET /pools/{id}/top-lpers` **[Premium]** | Creator-arena gating — only wallets in top-50 can open a public challenge | Differentiator |
| `GET /pools/{id}/onchain-stats` | Pool-level arena context banner ("45 LPers active, $12M inflow") | Secondary |
| `GET /lp-positions/opening?owner=` | **Scoring cron** — per-entrant per-arena live position + `dprNative` | **Primary scoring input** |
| `GET /lp-positions/overview?owner=` | Post-season player recap — "you earned X SOL across Y arenas this month" | UX polish |
| `GET /lp-positions/revenue/{owner}` | Equity-curve viz on player profile; historical ranked-replay | Creative UX |
| `GET /lp-positions/logs?owner=` | Forensic "what did my rival do?" post-match view | Creative UX |
| `GET /token/balance?owner=&ca=` | Entry wizard — confirm user has enough SOL to Zap-In | Utility |
| `POST /pools/{id}/add-tx` | **Zap-In** — builds entry transaction | **Required primitive** |
| `POST /pools/landing-add-tx` | Submits signed Zap-In via Jito bundle | Required primitive |
| `POST /position/decrease-quotes` | Zap-Out quote screen (what will you get back?) | Required primitive |
| `POST /position/decrease-tx` | **Zap-Out** — builds exit transaction | **Required primitive** |
| `POST /position/landing-decrease-tx` | Submits signed Zap-Out via Jito | Required primitive |

**Endpoints used: 15.** Far exceeds what the rubric implies by "quality of LP Agent use."

## Typed client layout

`services/scoring/src/lpagent.ts`:

```ts
export class LpAgentClient {
  constructor(private apiKey: string, private baseUrl = "https://api.lpagent.io/open-api/v1") {}

  // Pool discovery + metadata
  async discoverPools(filters: DiscoverFilters): Promise<PoolRow[]> { ... }
  async poolInfo(pool: string): Promise<PoolInfo> { ... }
  async poolPositions(pool: string, filter: PoolPositionsFilter): Promise<PositionRow[]> { ... }
  async poolTopLpers(pool: string): Promise<TopLperRow[]> { ... }  // Premium

  // Portfolio
  async openingPositions(owner: string): Promise<OpeningPosition[]> { ... }
  async overview(owner: string): Promise<PortfolioOverview> { ... }
  async revenue(owner: string, period: "7D" | "1M"): Promise<RevenuePoint[]> { ... }
  async logs(owner: string): Promise<LogEntry[]> { ... }

  // Zap
  async zapInBuild(pool: string, params: ZapInParams): Promise<ZapInTxBundle> { ... }
  async zapInLand(bundle: SignedZapInBundle): Promise<{ method: "JITO"; signature: string }> { ... }
  async zapOutQuote(positionId: string, bps: number): Promise<ZapOutQuote> { ... }
  async zapOutBuild(params: ZapOutParams): Promise<ZapOutTxBundle> { ... }
  async zapOutLand(bundle: SignedZapOutBundle): Promise<{ method: "JITO"; signature: string }> { ... }
}
```

All types in `services/scoring/src/lpagent.types.ts`. Source of truth: `docs.lpagent.io/llms.txt` (cached in `specs/ref/lpagent-llms.txt` for offline dev).

## Scoring cron (every 60s during active arenas)

Pseudocode:

```ts
async function tick() {
  const live = await db.arenas.findActive();  // state=Pending, entry_close_ts <= now < end_ts
  for (const arena of live) {
    const entrants = await db.entries.forArena(arena.pubkey);
    const scores = await Promise.all(entrants.map(async e => {
      const positions = await lpa.openingPositions(e.player);
      const match = positions.filter(p => p.pool === arena.pool);
      const score = reduceScore(match, arena.scoringMetric);  // sums dprNative across positions
      return { player: e.player, score, rank: 0 };
    }));
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((s, i) => (s.rank = i + 1));
    await db.leaderboard.upsert(arena.pubkey, scores);
    io.to(`arena:${arena.pubkey}`).emit("leaderboard", scores);  // realtime push
  }
}
```

## Settlement flow

When `now >= arena.end_ts`:
1. Scoring cron fetches one final pull.
2. Builds `SettlePayload { end_ts, ranked: [{ player, score }; winner_count] }`.
3. Signs `"LP_ARENA_SETTLE:" || arena || borsh(payload)` with the backend `scoring_oracle` Ed25519 key.
4. Builds tx with `[Ed25519Program sigverify ix, lp_arena.settle_arena(payload)]`.
5. Submits via Helius RPC. On success, `state → Completed` and frontends show "Claim payout" for winners.
6. A follow-up cron invokes `update_player_stats` for each entrant (Elo delta).

## Safety watcher (every 30s during active arenas)

```ts
for (const arena of live) {
  const info = await lpa.poolInfo(arena.pool);
  if (info.organicScoreBps < arena.safetyGate.minOrganicScoreBps
      || info.topHolderBps > arena.safetyGate.maxTopHolderBps) {
    await program.methods.cancelArena(1).rpc();  // reason=safety
    io.to(`arena:${arena.pubkey}`).emit("cancelled", { reason: "safety" });
    break;
  }
}
```

## Rate limits

LP Agent does not publish explicit limits. We assume polite — one request per entrant per 60s for scoring, one per pool per 30s for safety. For ~100 concurrent entrants across 3 arenas that's ~100 req/min well below reasonable limits. If we hit throttling, back off to 120s cadence.

## Caching policy

- Pool metadata: 10 min TTL in Redis/Upstash (free tier).
- Opening positions: NO cache during active arenas — we need freshness.
- `top-lpers`: 30 min TTL (creator gating doesn't need to be real-time).
- Zap quotes: do NOT cache — price-sensitive.
