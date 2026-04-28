// Long-running entry. Schedules four ticks at independent cadences
// (env-overridable). Crashes fail loud; per-tick errors are logged and
// the loop continues.
import { env } from "./env.ts";
import { leaderboardTick } from "./ticks/leaderboard.ts";
import { safetyTick } from "./ticks/safety.ts";
import { settleTick } from "./ticks/settle.ts";
import { eloTick } from "./ticks/elo.ts";
import { spawnTick } from "./ticks/spawn.ts";
import { log, err } from "./lib/log.ts";

type TickDef = { name: string; everyMs: number; run: () => Promise<void> };

const ticks: TickDef[] = [
  { name: "spawn", everyMs: env.spawnEveryMs, run: spawnTick },
  { name: "leaderboard", everyMs: env.leaderboardEveryMs, run: leaderboardTick },
  { name: "safety", everyMs: env.safetyEveryMs, run: safetyTick },
  { name: "settle", everyMs: env.settleEveryMs, run: settleTick },
  { name: "elo", everyMs: env.eloEveryMs, run: eloTick },
];

function schedule(t: TickDef) {
  const loop = async () => {
    try {
      await t.run();
    } catch (e) {
      err(t.name, "tick threw", e);
    } finally {
      setTimeout(loop, t.everyMs).unref();
    }
  };
  // Stagger initial fires so all four ticks don't hit Supabase at the same
  // millisecond on cold start.
  const delay = Math.floor(Math.random() * 2_000);
  setTimeout(loop, delay).unref();
  log("index", `scheduled ${t.name} every ${t.everyMs}ms (first +${delay}ms)`);
}

async function main() {
  log("index", `starting scoring service — rpc=${env.rpcUrl}`);
  for (const t of ticks) schedule(t);
}

const shutdown = (sig: string) => {
  log("index", `received ${sig} — exiting`);
  process.exit(0);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((e) => {
  err("index", "fatal", e);
  process.exit(1);
});
