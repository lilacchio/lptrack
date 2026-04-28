// Elo update cron: for each completed-and-not-yet-processed arena, batch
// update_player_stats for every entrant. Idempotency is tracked in a small
// JSON file (`.processed-elo.json`) — fine for the hackathon; promote to a
// Supabase column when we leave devnet.
//
// Source of truth for "completed arenas" is on-chain (state == Completed).
// Per-entrant scores still come from the Supabase leaderboard (built by the
// leaderboard tick).
import * as fs from "node:fs";
import * as path from "node:path";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  configPda,
  getConnection,
  getProgram,
  loadKeypair,
  statsPda,
  listProgramArenas,
} from "../lib/chain.ts";
import { supabase, type LeaderboardRow } from "../lib/supabase.ts";
import { env } from "../env.ts";
import { log, warn, err } from "../lib/log.ts";

const PROCESSED_PATH = path.join(env.repoRoot, "services", "scoring", ".processed-elo.json");
const INITIAL_ELO = 1200;
const K = 32;

function loadProcessed(): Set<string> {
  try {
    return new Set(JSON.parse(fs.readFileSync(PROCESSED_PATH, "utf-8")));
  } catch {
    return new Set();
  }
}

function saveProcessed(set: Set<string>) {
  fs.mkdirSync(path.dirname(PROCESSED_PATH), { recursive: true });
  fs.writeFileSync(PROCESSED_PATH, JSON.stringify([...set], null, 2));
}

type EntrantInput = {
  player: string;
  rank: number;
  rating: number;
  winnings: bigint;
};

function computeDeltas(entrants: EntrantInput[]): Map<string, number> {
  const n = entrants.length;
  const deltas = new Map<string, number>();
  if (n < 2) {
    for (const e of entrants) deltas.set(e.player, 0);
    return deltas;
  }
  for (const e of entrants) {
    let expected = 0;
    for (const o of entrants) {
      if (o.player === e.player) continue;
      expected += 1 / (1 + 10 ** ((o.rating - e.rating) / 400));
    }
    expected /= n - 1;
    const actual = (n - e.rank) / (n - 1);
    deltas.set(e.player, Math.round(K * (actual - expected)));
  }
  return deltas;
}

export async function eloTick(): Promise<void> {
  const processed = loadProcessed();
  const conn = getConnection();
  const admin = loadKeypair(env.adminKeypairPath);
  const program = getProgram(conn, admin);
  const [config] = configPda();

  const all = await listProgramArenas(conn, admin);
  const completed = all.filter((a) => a.state === "Completed");

  const candidates = completed.filter((a) => !processed.has(a.pubkey.toBase58()));
  if (candidates.length === 0) {
    log("elo", "nothing to process");
    return;
  }
  log("elo", `${candidates.length} arena(s) to process`);

  for (const arena of candidates) {
    const arenaPubkey = arena.pubkey.toBase58();
    try {
      const { data: lb, error: lbErr } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("arena_pubkey", arenaPubkey)
        .order("rank", { ascending: true });
      if (lbErr) throw new Error(`leaderboard: ${lbErr.message}`);
      const rows = (lb ?? []) as LeaderboardRow[];
      if (rows.length === 0) {
        warn("elo", `arena ${arenaPubkey} has no leaderboard rows`);
        processed.add(arenaPubkey);
        continue;
      }

      const playerKeys = rows.map((r) => new PublicKey(r.player_pubkey));
      const ratings = new Map<string, number>();
      for (const pk of playerKeys) {
        const [stats] = statsPda(pk);
        try {
          // @ts-expect-error anchor 0.31 typing
          const acct: any = await program.account.playerStats.fetch(stats);
          ratings.set(pk.toBase58(), Number(acct.eloRating ?? INITIAL_ELO));
        } catch {
          ratings.set(pk.toBase58(), INITIAL_ELO);
        }
      }

      // @ts-expect-error anchor 0.31 typing
      const arenaAcct: any = await program.account.arena.fetch(arena.pubkey);
      const totalPot = BigInt(arenaAcct.totalPrizePot.toString());
      const dist = arenaAcct.distribution.bps as number[];
      const winnerCount = Number(arenaAcct.distribution.winnerCount ?? 0);

      const inputs: EntrantInput[] = rows.map((r) => ({
        player: r.player_pubkey,
        rank: r.rank,
        rating: ratings.get(r.player_pubkey) ?? INITIAL_ELO,
        winnings:
          r.rank <= winnerCount
            ? (totalPot * BigInt(dist[r.rank - 1] ?? 0)) / 10_000n
            : 0n,
      }));

      const deltas = computeDeltas(inputs);

      for (const e of inputs) {
        const playerPk = new PublicKey(e.player);
        const [stats] = statsPda(playerPk);
        const wonArena = e.rank === 1;
        const delta = deltas.get(e.player) ?? 0;
        try {
          const sig = await program.methods
            .updatePlayerStats(delta, wonArena, e.winnings.toString() as any)
            .accountsStrict({
              config,
              playerKey: playerPk,
              stats,
              admin: admin.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .signers([admin])
            .rpc({ commitment: "confirmed" });
          log(
            "elo",
            `${e.player.slice(0, 8)}… rank ${e.rank} Δ=${delta} — ${sig.slice(0, 8)}…`,
          );

          await supabase.from("player_stats_cache").upsert({
            pubkey: e.player,
            elo: (ratings.get(e.player) ?? INITIAL_ELO) + delta,
            updated_at: new Date().toISOString(),
          });
        } catch (e2) {
          err("elo", `update_player_stats failed for ${e.player}`, e2);
        }
      }

      processed.add(arenaPubkey);
      saveProcessed(processed);
    } catch (e) {
      err("elo", `arena ${arenaPubkey} failed`, e);
    }
  }
}

if (process.argv.includes("--once")) {
  eloTick()
    .then(() => process.exit(0))
    .catch((e) => {
      err("elo", "fatal", e);
      process.exit(1);
    });
}
