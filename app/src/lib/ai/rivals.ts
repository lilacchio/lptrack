import type { RivalSummary } from "./schemas";

export type RivalInput = {
  arenaPoolId: string;
  rivals: Array<{
    owner: string;
    rank: number;
    binRangeLow?: number;
    binRangeHigh?: number;
    recentLogs: Array<{
      ts: string;
      kind: string; // "enter" | "rebalance" | "add" | "remove" | "exit" | string
      detail?: string;
    }>;
  }>;
};

export type RivalResult = RivalSummary & { stub: boolean };

export async function getRivalSummary(input: RivalInput): Promise<RivalResult> {
  return scenarioRivals(input);
}

function scenarioRivals(input: RivalInput): RivalResult {
  return {
    stub: true,
    rivals: input.rivals.slice(0, 3).map((r) => {
      const last = r.recentLogs[0];
      const kindCounts = r.recentLogs.reduce<Record<string, number>>((acc, l) => {
        const k = (l.kind ?? "").toLowerCase();
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
      const rebalances = kindCounts["rebalance"] ?? 0;
      const adds = kindCounts["add"] ?? 0;
      const removes = kindCounts["remove"] ?? 0;
      const exited = (kindCounts["exit"] ?? 0) > 0;
      const rangeWidth =
        r.binRangeLow != null && r.binRangeHigh != null
          ? r.binRangeHigh - r.binRangeLow
          : null;

      // Headline branches on activity profile — sniper / grinder / set-and-forget / bailing.
      let headline: string;
      if (exited) {
        headline = `${truncWallet(r.owner)} (rank ${r.rank}) bailed — exited their position before settle.`;
      } else if (rebalances >= 2) {
        headline = `${truncWallet(r.owner)} (rank ${r.rank}) is grinding — ${rebalances} rebalances logged. They're chasing the active bin.`;
      } else if (adds >= 2 && removes === 0) {
        headline = `${truncWallet(r.owner)} (rank ${r.rank}) keeps doubling down — ${adds} liquidity adds, no removes.`;
      } else if (last && last.kind?.toLowerCase() === "enter" && r.recentLogs.length === 1) {
        headline = `${truncWallet(r.owner)} (rank ${r.rank}) entered ${last.ts} and hasn't touched the position since.`;
      } else if (last) {
        headline = `${truncWallet(r.owner)} (rank ${r.rank}) last action: ${last.kind} at ${last.ts}.`;
      } else {
        headline = `${truncWallet(r.owner)} (rank ${r.rank}) — no on-chain logs yet.`;
      }

      // Detail branches on range tightness.
      let detail: string;
      if (rangeWidth == null) {
        detail = "Range data not yet indexed for this position.";
      } else if (rangeWidth <= 10) {
        detail = `Holding bins ${r.binRangeLow}–${r.binRangeHigh} — tight ${rangeWidth}-bin range, max capital efficiency but one-bad-tick from out-of-range.`;
      } else if (rangeWidth >= 40) {
        detail = `Holding bins ${r.binRangeLow}–${r.binRangeHigh} — wide ${rangeWidth}-bin range, defensive play that won't get knocked out by volatility.`;
      } else {
        detail = `Holding bins ${r.binRangeLow}–${r.binRangeHigh} (${rangeWidth} wide) — middle-of-the-road risk.`;
      }

      return {
        owner: r.owner,
        rank: r.rank,
        headline,
        detail,
      };
    }),
  };
}

function truncWallet(s: string) {
  return s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
}
