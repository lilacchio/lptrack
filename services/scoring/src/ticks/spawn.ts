// Spawn cron: every hour, if there's no arena currently in `entry_open`
// lifecycle, create a fresh one. Pool selection rotates daily through the top
// Meteora DAMM v2 pools by TVL (with a curated fallback list when LP Agent is
// unreachable). Idempotent against double-spawn from cron overlap by checking
// the entire program-owned arena set on each run.
//
// Run-once entry point: `pnpm --filter scoring run spawn:once` (added to
// package.json) or `tsx services/scoring/src/ticks/spawn.ts --once`.
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  BN,
  configPda,
  arenaPda,
  prizeVaultPda,
  getConnection,
  getProgram,
  loadKeypair,
  listProgramArenas,
  explorerTx,
} from "../lib/chain.ts";
import { topPoolsByTvl } from "../lib/lpagent.ts";
import type { LpAgentPool } from "../lib/lpagent.types.ts";
import { env } from "../env.ts";
import { log, warn, err } from "../lib/log.ts";

// Curated fallback pool rotation. Used when LP Agent /pools/discover fails or
// returns nothing eligible. All three are real Meteora pools; the spawn picks
// one deterministically from the day-of-year so the rotation is predictable
// for the demo.
const FALLBACK_POOLS: Array<{
  address: string;
  protocol: "meteora_dlmm" | "meteora_damm_v2";
  label: string;
}> = [
  // USD1·SOL DLMM v2 — same pool the manual create-long-arena.ts script uses
  { address: "6AJYTtz4h3HdxNcu66jdzLLWjggyfuEvRYa7tfPbxThi", protocol: "meteora_dlmm", label: "USD1·SOL" },
];

const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * ONE_HOUR;

// Arena cadence — entry window 24h, trade window 24h, total 48h. Daily spawn
// produces overlapping arenas: when one's entry window closes, the cron's next
// run creates the next.
const ENTRY_WINDOW_SEC = 24 * ONE_HOUR;
const TRADE_WINDOW_SEC = 24 * ONE_HOUR;

function pickPoolFromList(
  pools: Array<{ address: string; protocol: "meteora_dlmm" | "meteora_damm_v2"; label: string }>,
  nowSec: number,
): { address: string; protocol: "meteora_dlmm" | "meteora_damm_v2"; label: string } {
  const dayIdx = Math.floor(nowSec / ONE_DAY);
  return pools[dayIdx % pools.length];
}

function lpAgentToProtocolEnum(p: string): { meteoraDlmm: object } | { meteoraDammV2: object } {
  if (p === "meteora_damm_v2") return { meteoraDammV2: {} };
  return { meteoraDlmm: {} };
}

async function pickPool(nowSec: number): Promise<{
  pool: PublicKey;
  protocolEnum: { meteoraDlmm: object } | { meteoraDammV2: object };
  label: string;
}> {
  // Try LP Agent — top-3 by TVL across DLMM + DAMM v2, then deterministic
  // rotation by day-of-year so each new arena is a different pair.
  try {
    const top: LpAgentPool[] = await topPoolsByTvl(6);
    // LP Agent's /pools/discover returns `protocol: "meteora"` as a single
    // string — the DLMM-vs-DAMM-v2 split is encoded by `bin_step` (DLMM has
    // a non-zero bin_step; DAMM v2 doesn't).
    const eligible = top.filter((p) => (p.protocol as string | undefined) === "meteora");
    if (eligible.length > 0) {
      const dayIdx = Math.floor(nowSec / ONE_DAY);
      const chosen = eligible[dayIdx % eligible.length];
      const binStep = Number((chosen as { bin_step?: number }).bin_step ?? 0);
      const subProtocol = binStep > 0 ? "meteora_dlmm" : "meteora_damm_v2";
      return {
        pool: new PublicKey(chosen.pool),
        protocolEnum: lpAgentToProtocolEnum(subProtocol),
        label: `${chosen.token0_symbol}·${chosen.token1_symbol}`,
      };
    }
    warn("spawn", "LP Agent returned no eligible pools — falling back to curated list");
  } catch (e) {
    warn("spawn", `LP Agent /pools/discover failed — using curated fallback: ${(e as Error).message}`);
  }
  const fb = pickPoolFromList(FALLBACK_POOLS, nowSec);
  return {
    pool: new PublicKey(fb.address),
    protocolEnum: lpAgentToProtocolEnum(fb.protocol),
    label: fb.label,
  };
}

export async function spawnTick(): Promise<void> {
  const conn = getConnection();
  const admin = loadKeypair(env.adminKeypairPath);

  // Idempotency: if any arena is currently in entry_open, skip.
  let existing;
  try {
    existing = await listProgramArenas(conn, admin);
  } catch (e) {
    err("spawn", "listProgramArenas failed", e);
    return;
  }
  const openCount = existing.filter((a) => a.lifecycle === "entry_open").length;
  if (openCount > 0) {
    log(
      "spawn",
      `${openCount} arena(s) accepting entries — skipping spawn (total on-chain: ${existing.length})`,
    );
    return;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const { pool, protocolEnum, label } = await pickPool(nowSec);

  const program = getProgram(conn, admin);
  const [config] = configPda();
  // @ts-expect-error anchor 0.31 typing
  const configAcct: any = await program.account.arenaConfig.fetch(config);
  const index = BigInt(configAcct.arenaCount.toString());
  const [arenaPdaKey] = arenaPda(config, index);
  const [prizeVault] = prizeVaultPda(arenaPdaKey);

  const entryOpenTs = new BN(nowSec);
  const entryCloseTs = new BN(nowSec + ENTRY_WINDOW_SEC);
  const endTs = new BN(nowSec + ENTRY_WINDOW_SEC + TRADE_WINDOW_SEC);

  const params = {
    pool,
    poolProtocol: protocolEnum,
    entryOpenTs,
    entryCloseTs,
    endTs,
    entryFeeLamports: new BN(25_000_000), // 0.025 SOL
    potContributionBps: 10_000,
    minEntrants: 2,
    maxEntrants: 64,
    scoringMetric: { dprNative: {} },
    safetyGate: {
      minOrganicScoreBps: 0,
      requireMintFreeze: false,
      maxTopHolderBps: 10_000,
    },
    distribution: {
      bps: [5000, 3000, 2000, 0, 0, 0, 0, 0, 0, 0],
      winnerCount: 3,
    },
  };

  log(
    "spawn",
    `creating arena #${index.toString()} on ${label} (${pool.toBase58().slice(0, 8)}…) — entry ${ENTRY_WINDOW_SEC / 3600}h, trade ${TRADE_WINDOW_SEC / 3600}h`,
  );

  try {
    const sig = await program.methods
      .createArena(params as any)
      .accountsStrict({
        config,
        arena: arenaPdaKey,
        prizeVault,
        creator: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc({ commitment: "confirmed" });
    log(
      "spawn",
      `✅ arena #${index.toString()} ${arenaPdaKey.toBase58().slice(0, 8)}… ready — ${explorerTx(sig)}`,
    );
  } catch (e) {
    err("spawn", `createArena failed for index ${index.toString()}`, e);
  }
}

if (process.argv.includes("--once")) {
  spawnTick()
    .then(() => process.exit(0))
    .catch((e) => {
      err("spawn", "fatal", e);
      process.exit(1);
    });
}
