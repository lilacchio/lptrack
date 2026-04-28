// 30s tick: per-pool safety check vs the on-chain SafetyGate. If breached,
// call cancel_arena(reason=1) signed by the admin keypair.
//
// Live-arena set comes from on-chain (`listProgramArenas`) so this stays in
// lockstep with the spawn cron. Supabase is only written to (state flip on
// successful cancel) so the frontend Realtime channel ticks immediately.
import {
  configPda,
  getConnection,
  getProgram,
  loadKeypair,
  listProgramArenas,
} from "../lib/chain.ts";
import { poolDiscoverOne } from "../lib/lpagent.ts";
import { supabase } from "../lib/supabase.ts";
import { env } from "../env.ts";
import { log, warn, err } from "../lib/log.ts";

export async function safetyTick(): Promise<void> {
  const conn = getConnection();
  const admin = loadKeypair(env.adminKeypairPath);

  const all = await listProgramArenas(conn, admin);
  // Watch arenas while pool is at risk to existing entrants — that's anything
  // from entry_open through live (settling/settled/cancelled don't matter).
  const live = all.filter(
    (a) => a.lifecycle === "entry_open" || a.lifecycle === "live",
  );

  if (live.length === 0) {
    log("safety", "no live arenas");
    return;
  }
  log("safety", `tick: ${live.length} live arena(s)`);

  const program = getProgram(conn, admin);

  for (const arena of live) {
    const arenaPk = arena.pubkey;
    const arenaPubkeyStr = arenaPk.toBase58();
    try {
      // @ts-expect-error anchor 0.31 typing
      const arenaAcct: any = await program.account.arena.fetch(arenaPk);
      const gate = arenaAcct.safetyGate as {
        minOrganicScoreBps: number;
        requireMintFreeze: boolean;
        maxTopHolderBps: number;
      };
      const poolStr = arena.pool.toBase58();
      const pool = await poolDiscoverOne(poolStr);
      if (!pool) {
        warn("safety", `pool ${poolStr} not in discover feed`);
        continue;
      }

      const organicBps = Math.round(((pool.organic_score ?? 0) as number) * 100);
      // LP Agent's `top_holder` field is inconsistently scaled across pools —
      // some return a clean percentage (e.g., 18 = 18%), others return a
      // 5-decimal-scaled value (e.g., 3820662 ~= 38.2% with 5 decimals). When
      // the raw number is > 100 (no real percentage exceeds that), we can't
      // trust the unit, so we treat it as unknown and skip the top-holder
      // breach instead of cancelling on a parsing artefact. Real high
      // concentration would still need to be flagged via a different signal.
      const topHolderRaw = Number(pool.top_holder ?? 0);
      const topHolderTrusted = topHolderRaw >= 0 && topHolderRaw <= 100;
      const topHolderBps = topHolderTrusted
        ? Math.round(topHolderRaw * 100)
        : 0;
      const minOrganic = gate.minOrganicScoreBps ?? 0;
      const maxTop = gate.maxTopHolderBps ?? 10_000;
      const mintFreezeOk = gate.requireMintFreeze ? pool.mint_freeze === true : true;

      const breached =
        organicBps < minOrganic || topHolderBps > maxTop || !mintFreezeOk;

      if (!breached) {
        log("safety", `arena ${arenaPubkeyStr.slice(0, 8)}… ok`, {
          organicBps,
          topHolderBps,
        });
        continue;
      }

      warn("safety", `arena ${arenaPubkeyStr} BREACHED — cancelling`, {
        organicBps,
        topHolderBps,
        topHolderRaw,
        topHolderTrusted,
        mintFreezeOk,
      });

      const [config] = configPda();
      const sig = await program.methods
        .cancelArena(1)
        .accountsStrict({
          config,
          arena: arenaPk,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
      log("safety", `cancelled — ${sig}`);

      await supabase
        .from("arenas")
        .update({ state: "cancelled" })
        .eq("pubkey", arenaPubkeyStr);
    } catch (e) {
      err("safety", `arena ${arenaPubkeyStr} failed`, e);
    }
  }
}

if (process.argv.includes("--once")) {
  safetyTick()
    .then(() => process.exit(0))
    .catch((e) => {
      err("safety", "fatal", e);
      process.exit(1);
    });
}
