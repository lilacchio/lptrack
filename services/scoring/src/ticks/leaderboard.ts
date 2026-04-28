// 60s tick: pull live arenas (lifecycle in {live, settling}), enumerate the
// program's Entry PDAs for each, fetch every entrant's open LP-Agent positions,
// reduce by scoring metric (default dpr_native sum), upsert leaderboard rows.
//
// Sources both arenas and entries from on-chain so it follows the spawn cron
// without needing a Supabase mirror of the program's state. Supabase is only
// written to (the leaderboard table the frontend Realtime subscribes to).
import { getConnection, loadKeypair, listProgramArenas, listProgramEntriesForArena } from "../lib/chain.ts";
import { ownerOpeningPositions } from "../lib/lpagent.ts";
import type { LpAgentPosition } from "../lib/lpagent.types.ts";
import { supabase } from "../lib/supabase.ts";
import { env } from "../env.ts";
import { log, warn, err } from "../lib/log.ts";

type Score = {
  player: string;
  dprNative: number;
  pnlNative: number;
  score: number;
};

function reduceForPlayer(positions: LpAgentPosition[]): Omit<Score, "player"> {
  let dprNative = 0;
  let pnlNative = 0;
  for (const p of positions) {
    dprNative += typeof p.dpr === "number" ? p.dpr : 0;
    pnlNative += p.pnl?.valueNative ?? 0;
  }
  return { dprNative, pnlNative, score: dprNative };
}

export async function leaderboardTick(): Promise<void> {
  const conn = getConnection();
  const admin = loadKeypair(env.adminKeypairPath);

  const all = await listProgramArenas(conn, admin);
  // Trading window: entry closed but arena hasn't settled.
  const live = all.filter(
    (a) => a.lifecycle === "live" || a.lifecycle === "settling",
  );

  if (live.length === 0) {
    log("leaderboard", "no live arenas");
    return;
  }
  log("leaderboard", `tick: ${live.length} live arena(s)`);

  for (const arena of live) {
    try {
      const entries = await listProgramEntriesForArena(conn, admin, arena.pubkey);
      if (entries.length === 0) continue;

      const poolId = arena.pool.toBase58();
      const arenaPubkey = arena.pubkey.toBase58();

      const scores = await Promise.all(
        entries.map(async (e): Promise<Score> => {
          const playerStr = e.player.toBase58();
          try {
            const positions = await ownerOpeningPositions(playerStr);
            const matching = positions.filter((p) => p.pool === poolId);
            const reduced = reduceForPlayer(matching);
            return { player: playerStr, ...reduced };
          } catch (e2) {
            warn("leaderboard", `lpagent failed for ${playerStr}`, {
              err: (e2 as Error).message,
            });
            return { player: playerStr, dprNative: 0, pnlNative: 0, score: 0 };
          }
        }),
      );

      scores.sort((a, b) => b.score - a.score);
      const rows = scores.map((s, i) => ({
        arena_pubkey: arenaPubkey,
        player_pubkey: s.player,
        rank: i + 1,
        score: s.score,
        dpr_native: s.dprNative,
        pnl_native: s.pnlNative,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("leaderboard")
        .upsert(rows, { onConflict: "arena_pubkey,player_pubkey" });
      if (error) throw new Error(`upsert leaderboard: ${error.message}`);
      log(
        "leaderboard",
        `arena ${arenaPubkey.slice(0, 8)}… upserted ${rows.length}`,
      );
    } catch (e) {
      err("leaderboard", `arena ${arena.pubkey.toBase58()} failed`, e);
    }
  }
}

if (process.argv.includes("--once")) {
  leaderboardTick()
    .then(() => process.exit(0))
    .catch((e) => {
      err("leaderboard", "fatal", e);
      process.exit(1);
    });
}
