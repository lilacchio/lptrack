# 01 — Anchor Program

File: `programs/lp-arena/src/lib.rs` + `state.rs` + `errors.rs` + `events.rs`.
Network: **Solana devnet** for the hackathon.

## Program ID

Placeholder `LPArenaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`. Replace with the real keypair output of `anchor keys list` before first devnet deploy.

## PDAs

| Account | Seeds | Purpose |
|---|---|---|
| `ArenaConfig` | `[b"config"]` | singleton: admin, scoring oracle pubkey, protocol fee vault |
| `Arena` | `[b"arena", config, index_u64_le]` | one tournament |
| `prize_vault` (SOL) | `[b"prize_vault", arena]` | holds entry fees → prize pot |
| `Entry` | `[b"entry", arena, player]` | one player's participation |
| `PlayerStats` | `[b"stats", player]` | lifetime Elo + record |
| `Wager` | `[b"wager", arena, spectator]` | spectator wager |
| `wager_vault` (SOL) | `[b"wager_vault", arena]` | spectator pot |

## Instructions (8)

1. **`initialize_config(scoring_oracle, protocol_fee_bps)`** — admin only, once.
2. **`create_arena(params)`** — admin in phase 1; any wallet in phase 4 (creator arenas) with a minimum creator bond.
3. **`enter_arena(position_commitment: [u8;32])`** — player pays entry fee → prize_vault; creates Entry PDA. `position_commitment = sha256(pool || player || slot)` — just a unique tag; the backend scorer actually matches by `(player, pool)` off-chain.
4. **`settle_arena(payload: SettlePayload)`** — any cranker, but the preceding instruction MUST be an `Ed25519Program` instruction signed by `config.scoring_oracle` over `"LP_ARENA_SETTLE:" || arena || borsh(payload)`. Writes winner ranking, locks pot, computes protocol fee.
5. **`claim_payout()`** — self-serve per winner. Reads rank from `arena.winners`, computes payout from `distribution.bps`, transfers from prize_vault PDA.
6. **`cancel_arena(reason)`** — admin or permissionless-on-under-subscription. Sets state=Cancelled.
7. **`claim_refund()`** — any entrant of a Cancelled arena; returns their deposit.
8. **`place_wager(predicted_winner, amount)`** — spectator parimutuel; must be before `entry_close_ts`.
9. **`update_player_stats(delta_rating, won_arena, winnings_delta_lamports)`** — admin cron batches Elo updates post-settlement. `init_if_needed` creates stats on first play.

(9 total; wager claim will be added in phase 3 alongside wager settlement.)

## Scoring oracle flow (why it's trustless enough)

1. Backend scoring service runs a cron every 60s during a live arena, fetching `/lp-positions/opening?owner=<player>` and `/lp-positions/revenue/{owner}` for every entrant, filtered to `arena.pool`.
2. When `end_ts` is reached, the scorer ranks entrants by `arena.scoring_metric` and signs a `SettlePayload` with the backend's `scoring_oracle` Ed25519 key.
3. Anyone can invoke `settle_arena`, but they must include the Ed25519Program sigverify instruction with the backend's signed payload. The Anchor ix pulls the sigverify ix from the Instructions sysvar, checks the signer pubkey matches `config.scoring_oracle`, and checks the signed message matches the claim.
4. **Public verifiability**: any third party can re-query LP Agent's public API for the same window and re-derive the ranking. If the scorer lies, fraud is provable. This is good enough for a hackathon demo; v2 can route through Switchboard TEE or LP-Agent-attested data.

Reference for sigverify pattern: Dialect's `sigverify` crate + Solana docs on Ed25519Program instruction layout.

## Safety circuit breaker

A separate off-chain watcher polls `/pools/{id}/info` during live arenas. If `organic_score` drops below `arena.safety_gate.min_organic_score_bps` OR `top_holder` crosses the cap, the watcher calls `cancel_arena(reason=1)` signed by the admin key. Entrants then self-serve `claim_refund()`.

## Fee math

- Entry fee → 100% → `prize_vault` (phase 1 simplification: `pot_contribution_bps = 10_000`).
- On settlement: `protocol_fee = pot_balance × config.protocol_fee_bps / 10_000` (default 200 bps = 2%); rest is `total_prize_pot`.
- On `claim_payout`: player receives `total_prize_pot × distribution.bps[rank] / 10_000`.

## Gotchas / review list

- `prize_vault` is a bare `UncheckedAccount` SOL holder. Transfers OUT use `CpiContext::new_with_signer` with its PDA seeds. Transfers IN are regular `system_program::transfer`.
- `Entry::position_commitment` is purely informational; settlement happens off-chain via LP Agent. We keep it for replay-visibility and a future on-chain dispute mechanism.
- `MAX_ENTRANTS_HARD_CAP = 256` keeps settlement within compute budget even if `ranked.len() == winner_count` always (< 10 winners).
- `SettlePayload.end_ts` is redundant with `arena.end_ts` but included so the signed message is self-describing (replay-resistant across arenas).
- `cancel_arena(reason=0)` (under-subscribed) is permissionless — anyone can crank it after entry close, so there's no griefing if admin is unresponsive.

## Tests to write (see `specs/06-testing.md`)

1. `initialize_config` idempotency.
2. `create_arena` rejects overlapping timestamps, bad bps, zero entrants.
3. `enter_arena` rejects duplicate entry (same player twice), closed window, full arena, insufficient fee.
4. `settle_arena` rejects missing sigverify, wrong signer, tampered payload, arena not ended.
5. `claim_payout` rejects non-winner, double-claim, wrong state.
6. `claim_refund` full lifecycle: under-subscribed arena → all entrants refunded.
7. Integration: 4 players enter, end_ts ticks, oracle settles, winners claim, pot balance goes to 0.

## Compute budget

Worst-case tx = `settle_arena` with 10 winners. Estimated CU:
- Ed25519 sigverify: ~5,000 CU
- Borsh deserialize payload: ~3,000 CU
- Loop writes to `arena.winners`: ~500 CU
- Account writes: ~2,000 CU
- Total: well under 200k default limit.

`claim_payout` is tiny: one CPI transfer + one account write.
