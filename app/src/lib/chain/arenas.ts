import "server-only";

import { Connection, PublicKey } from "@solana/web3.js";
import { getReadOnlyProgram } from "@/lib/chain/program";

export type ArenaLifecycle =
  | "pending" // created but entry hasn't opened yet
  | "entry_open" // entry window currently accepting wallets
  | "live" // entry closed, trading window running, oracle scoring
  | "settling" // ended, awaiting oracle settlement tx
  | "settled" // payouts claimable
  | "cancelled"; // refunds claimable

const ARENA_STATE_NUM_TO_NAME: Record<number, string> = {
  0: "Pending",
  1: "Active",
  2: "Settling",
  3: "Completed",
  4: "Cancelled",
};

export type ArenaSummary = {
  pubkey: string;
  index: number;
  pool: string; // LP Agent / Meteora pool id (base58)
  poolProtocol: "MeteoraDlmm" | "MeteoraDammV2" | "Unknown";
  entryOpenTs: number; // unix seconds
  entryCloseTs: number;
  endTs: number;
  entryFeeLamports: number;
  currentEntrantCount: number;
  minEntrants: number;
  maxEntrants: number;
  totalPrizePot: number; // lamports, set at settlement
  winners: string[]; // base58, length up to MAX_WINNERS, "" / 11111111… for unset slots
  lifecycle: ArenaLifecycle;
  rawState: string; // "Pending" / "Active" / ...
};

/**
 * Resolves the on-chain `Arena.state` enum + the timestamps to a single
 * lifecycle tag the UI can switch on. The on-chain `state` is monotonic:
 * Pending → Active → Settling → Completed (or → Cancelled at any point), so
 * we only need timestamps to refine `Pending` into `pending` vs `entry_open`.
 */
export function deriveArenaLifecycle(
  state: string,
  entryOpenTs: number,
  entryCloseTs: number,
  nowSec: number
): ArenaLifecycle {
  if (state === "Cancelled") return "cancelled";
  if (state === "Completed") return "settled";
  if (state === "Settling") return "settling";
  if (state === "Active") return "live";
  // Pending: entry may be open, may not yet have started.
  if (nowSec < entryOpenTs) return "pending";
  if (nowSec < entryCloseTs) return "entry_open";
  // Pending past entry_close means the on-chain state hasn't transitioned yet
  // (no one has called the state-advancing instruction). Treat as live.
  return "live";
}

type AnchorArena = {
  config: PublicKey;
  index: { toString(): string };
  creator: PublicKey;
  pool: PublicKey;
  poolProtocol: Record<string, unknown>;
  entryOpenTs: { toString(): string };
  entryCloseTs: { toString(): string };
  endTs: { toString(): string };
  entryFeeLamports: { toString(): string };
  currentEntrantCount: number;
  minEntrants: number;
  maxEntrants: number;
  state: Record<string, unknown> | number;
  winners: PublicKey[];
  totalPrizePot: { toString(): string };
};

function readEnumName(v: unknown): string {
  if (typeof v === "number") return ARENA_STATE_NUM_TO_NAME[v] ?? "Pending";
  if (typeof v === "object" && v !== null) {
    const key = Object.keys(v as Record<string, unknown>)[0] ?? "pending";
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return "Pending";
}

function readPoolProtocol(v: unknown): ArenaSummary["poolProtocol"] {
  const name = readEnumName(v);
  if (name === "MeteoraDammV2" || name === "MeteoraDlmm") return name;
  return "Unknown";
}

const ZERO_PUBKEY = PublicKey.default.toBase58();

function toSummary(rec: { publicKey: PublicKey; account: AnchorArena }): ArenaSummary {
  const a = rec.account;
  const state = readEnumName(a.state);
  const entryOpenTs = Number(a.entryOpenTs.toString());
  const entryCloseTs = Number(a.entryCloseTs.toString());
  const endTs = Number(a.endTs.toString());
  const winners = (a.winners ?? []).map((w) => w.toBase58());
  return {
    pubkey: rec.publicKey.toBase58(),
    index: Number(a.index.toString()),
    pool: a.pool.toBase58(),
    poolProtocol: readPoolProtocol(a.poolProtocol),
    entryOpenTs,
    entryCloseTs,
    endTs,
    entryFeeLamports: Number(a.entryFeeLamports.toString()),
    currentEntrantCount: a.currentEntrantCount,
    minEntrants: a.minEntrants,
    maxEntrants: a.maxEntrants,
    totalPrizePot: Number(a.totalPrizePot?.toString() ?? "0"),
    winners: winners.filter((w) => w !== ZERO_PUBKEY),
    lifecycle: deriveArenaLifecycle(
      state,
      entryOpenTs,
      entryCloseTs,
      Math.floor(Date.now() / 1000)
    ),
    rawState: state,
  };
}

/**
 * Fetches every Arena account owned by the program and returns sorted summaries.
 * Sort order: live + entry_open first (by `endTs` asc, soonest-ending first),
 * then everything else by `endTs` desc (most recent first).
 */
export async function listArenas(
  connection: Connection
): Promise<ArenaSummary[]> {
  const program = getReadOnlyProgram(connection);
  const records = (await (
    program.account as Record<
      string,
      { all: () => Promise<Array<{ publicKey: PublicKey; account: AnchorArena }>> }
    >
  ).arena.all()) as Array<{ publicKey: PublicKey; account: AnchorArena }>;
  const summaries = records.map(toSummary);

  const isOpen = (a: ArenaSummary) =>
    a.lifecycle === "entry_open" || a.lifecycle === "live";

  return summaries.sort((a, b) => {
    if (isOpen(a) && !isOpen(b)) return -1;
    if (!isOpen(a) && isOpen(b)) return 1;
    if (isOpen(a) && isOpen(b)) return a.endTs - b.endTs;
    return b.endTs - a.endTs;
  });
}

/**
 * Pick the arena to feature on the home banner. Prefers an `entry_open`
 * arena (so the CTA leads somewhere actionable); falls back to the latest
 * `live` arena, then `settled`.
 */
export function pickFeaturedArena(arenas: ArenaSummary[]): ArenaSummary | null {
  return (
    arenas.find((a) => a.lifecycle === "entry_open") ??
    arenas.find((a) => a.lifecycle === "live") ??
    arenas.find((a) => a.lifecycle === "settled") ??
    arenas[0] ??
    null
  );
}

export function lifecycleLabel(l: ArenaLifecycle): string {
  switch (l) {
    case "pending":
      return "scheduled";
    case "entry_open":
      return "entry open";
    case "live":
      return "live";
    case "settling":
      return "settling";
    case "settled":
      return "settled";
    case "cancelled":
      return "cancelled";
  }
}

export function lifecycleAccent(
  l: ArenaLifecycle
): "emerald" | "orange" | "sky" | "violet" | "muted" {
  switch (l) {
    case "entry_open":
      return "emerald"; // green = go
    case "live":
      return "orange"; // hot = running
    case "settling":
      return "sky";
    case "settled":
      return "violet";
    case "cancelled":
      return "muted";
    case "pending":
      return "muted";
  }
}
