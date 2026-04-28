# scoring

Long-running Node service with four crons that drive LP Arena from off-chain
data.

## Ticks

| Tick           | Cadence | What it does |
|----------------|---------|--------------|
| `leaderboard`  | 60s     | For each live arena, pulls each entrant's open positions from LP Agent (`/lp-positions/opening`), reduces to a score (default `dpr_native` sum), upserts ranked rows into Supabase `leaderboard`. |
| `safety`       | 30s     | For each live arena, fetches pool metadata from LP Agent, compares vs the on-chain `SafetyGate`. If breached, calls `cancel_arena(reason=1)` from the admin keypair. |
| `settle`       | 30s     | For each arena past `end_ts` and still `Pending`/`Settling` on chain, builds `SettlePayload` from the latest leaderboard, signs with the scoring oracle, submits `[Ed25519 sigverify, settle_arena]` as a v0 tx. |
| `elo`          | 120s    | For each completed arena not yet processed, computes Elo deltas (K=32 with linear actual-score), calls `update_player_stats` for every entrant, caches in `player_stats_cache`. |

## Run locally

```bash
pnpm install
pnpm --filter scoring dev          # long-running, all four ticks
pnpm --filter scoring tick:leaderboard   # one-shot
pnpm --filter scoring tick:safety
pnpm --filter scoring tick:settle
pnpm --filter scoring tick:elo
```

## Required env

Loaded from `<repoRoot>/.env.local`:

| Var | Used by |
|---|---|
| `LPAGENT_API_KEY` | leaderboard, safety |
| `LPAGENT_BASE_URL` (optional, default `https://api.lpagent.io`) | leaderboard, safety |
| `HELIUS_DEVNET_RPC_URL` (optional, falls back to public devnet) | safety, settle, elo |
| `SUPABASE_URL` | all |
| `SUPABASE_SERVICE_ROLE_KEY` | all |
| `SCORING_ORACLE_KEYPAIR_PATH` (default `<repoRoot>/keypairs/scoring-oracle.json`) | settle |
| `ADMIN_KEYPAIR_PATH` (default `~/.config/solana/id.json`) | safety, settle, elo |

Optional cadence overrides (ms): `LEADERBOARD_TICK_MS`, `SAFETY_TICK_MS`,
`SETTLE_TICK_MS`, `ELO_TICK_MS`.

## Deploy to Railway

`railway.json` + `Procfile` are wired. From the Railway dashboard:

1. New project → "Deploy from GitHub repo" → pick `lptrack`.
2. Set the **root directory** to repo root (so the workspace install works).
3. Override the **start command** if the dashboard doesn't pick up `railway.json`:
   `pnpm --filter scoring start`.
4. Set secrets from the table above. For keypairs, paste the JSON array as
   `ADMIN_KEYPAIR_JSON` / `SCORING_ORACLE_KEYPAIR_JSON` and update env.ts to
   read them when set (TODO — leave a follow-up before going live).
5. Verify the worker starts: logs should show `starting scoring service` and
   one tick fire per cadence.

Currently the long-running devnet arena
`CfUmX84hp7BkuwTVT5gK61kWfp9VCnoKih8m6buv2b9r` (entry window ends
2026-04-26 ~24h after creation, settlement on 2026-05-02) is the real
target — once the entry window closes the leaderboard tick will start
producing rows.
