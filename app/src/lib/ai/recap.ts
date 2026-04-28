import type { PostSeasonRecap } from "./schemas";

export type RecapInput = {
  player: {
    pubkey: string;
    finalRank: number;
    finalScore: number;
    enteredAt: string;
    logs: Array<{ ts: string; kind: string; detail?: string }>;
  };
  winner: {
    pubkey: string;
    finalScore: number;
    logs: Array<{ ts: string; kind: string; detail?: string }>;
  };
  pool: {
    open: number;
    high: number;
    low: number;
    close: number;
    hourlyVolatility: number;
  };
};

export type RecapResult = PostSeasonRecap & { stub: boolean };

export async function getRecap(input: RecapInput): Promise<RecapResult> {
  return scenarioRecap(input);
}

function scenarioRecap(input: RecapInput): RecapResult {
  const gap = input.winner.finalScore - input.player.finalScore;
  const playerActions = input.player.logs.length;
  const winnerActions = input.winner.logs.length;
  const winnerRebalances = input.winner.logs.filter(
    (l) => (l.kind ?? "").toLowerCase() === "rebalance",
  ).length;
  const playerRebalances = input.player.logs.filter(
    (l) => (l.kind ?? "").toLowerCase() === "rebalance",
  ).length;
  const poolRange = input.pool.high - input.pool.low;
  const poolDriftPct = (poolRange / Math.max(input.pool.open, 1e-9)) * 100;

  // Branch on rank tier first, then on gap magnitude vs. activity vs. volatility.
  const rank = input.player.finalRank;
  const isWinner = rank === 1;
  const isPodium = rank > 1 && rank <= 3;
  const isClose = gap > 0 && gap <= input.player.finalScore * 0.1; // within 10%
  const isBlowout = gap > input.player.finalScore * 0.5;

  const did_well: string =
    isWinner
      ? `You won. ${playerActions} action${playerActions === 1 ? "" : "s"} during a ${poolDriftPct.toFixed(1)}% pool drift — the discipline paid.`
    : isPodium
      ? `Rank ${rank} on the podium${gap > 0 ? `, ${gap.toFixed(2)} pts off first` : ""}. ${playerRebalances} rebalance${playerRebalances === 1 ? "" : "s"} kept you in range when the pool moved ${poolDriftPct.toFixed(1)}%.`
    : playerActions > 0
      ? `You logged ${playerActions} action${playerActions === 1 ? "" : "s"} across the arena window — engagement is half of getting better at this.`
      : `You held your range through a ${poolDriftPct.toFixed(1)}% pool move — passive plays only work when the range is sized right.`;

  let cost_you_rank: string;
  if (isWinner) {
    cost_you_rank = `Nothing cost you the rank. The runner-up finished ${gap.toFixed(2)} pts behind${winnerRebalances > 0 ? ` despite ${winnerRebalances} rebalance${winnerRebalances === 1 ? "" : "s"}` : ""}.`;
  } else if (isClose) {
    cost_you_rank = `Razor close — ${gap.toFixed(2)} pts. The winner ${winnerRebalances > playerRebalances ? `out-rebalanced you (${winnerRebalances} vs ${playerRebalances})` : `ran a ${winnerActions}-action playbook`} — one or two more in-range moves and that gap flips.`;
  } else if (isBlowout) {
    cost_you_rank = `${gap.toFixed(2)} pts is a structural gap, not a tactical miss. The winner held ${winnerActions} action${winnerActions === 1 ? "" : "s"}; if your range was out for any meaningful chunk of the ${poolDriftPct.toFixed(1)}% drift, fees stopped accruing for that whole window. Tighter sizing + earlier rebalances close most of it.`;
  } else {
    cost_you_rank = `${gap.toFixed(2)} pts behind. The winner logged ${winnerRebalances} rebalance${winnerRebalances === 1 ? "" : "s"} vs your ${playerRebalances} — staying in range during the ${poolDriftPct.toFixed(1)}% drift is what separated rank 1 from rank ${rank}.`;
  }

  const next_arena_cta: string =
    input.pool.hourlyVolatility > 1.5
      ? "Try a calmer pool next — high-vol arenas reward speed. SOL/USDC 24h with the Coach's Balanced preset is a softer learning curve."
    : poolDriftPct > 5
      ? "The pool moved a lot this season — same pair, Wide preset, will give you more cushion."
    : isPodium
      ? "Same pool, same preset, larger position. You've already got the read on it."
      : "Try a 24h SOL/USDC arena with the Coach's Balanced preset for a softer learning curve.";

  return {
    stub: true,
    final_rank: rank,
    did_well,
    cost_you_rank,
    next_arena_cta,
  };
}
