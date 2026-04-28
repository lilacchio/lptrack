import type { CoachSuggestion } from "./schemas";

export type CoachInput = {
  poolId: string;
  activeBin: number;
  binStep: number;
  price1hChangePct: number;
  price6hChangePct: number;
  price24hChangePct: number;
  arenaDurationHours: number;
  riskTolerance: "Tight" | "Balanced" | "Wide";
};

export type CoachResult = CoachSuggestion & { stub: boolean };

export async function getCoachSuggestion(input: CoachInput): Promise<CoachResult> {
  return scenarioCoach(input);
}

// Scenario-aware heuristic. Branches on (volatility regime × risk tolerance ×
// arena duration) so the suggestion changes meaningfully across pools instead
// of a single canned response.
function scenarioCoach(input: CoachInput): CoachResult {
  const vol1h = Math.abs(input.price1hChangePct);
  const vol6h = Math.abs(input.price6hChangePct);
  const vol24h = Math.abs(input.price24hChangePct);

  // Regime: choppy = recent move dominates older move; trending = consistent
  // direction; calm = low magnitude across all windows.
  const regime: "calm" | "drifting" | "choppy" | "trending" =
    vol6h < 0.5 && vol24h < 1.5
      ? "calm"
      : vol1h > vol6h * 0.6
        ? "choppy"
        : Math.sign(input.price1hChangePct) === Math.sign(input.price24hChangePct) &&
            vol24h > 2
          ? "trending"
          : "drifting";

  const riskMultiplier =
    input.riskTolerance === "Tight" ? 0.7 :
    input.riskTolerance === "Wide" ? 2.6 : 1.4;

  // Duration tilt: longer arenas need wider ranges since price has more time to
  // wander out. Cap to avoid silly-wide ranges on multi-day arenas.
  const durationTilt = Math.min(2, 0.6 + input.arenaDurationHours / 36);

  // "Pricing budget" — how much drift the position should tolerate, in pct.
  const pricingBudget = Math.max(0.4, vol6h * riskMultiplier * durationTilt);
  const binsEachSide = Math.max(
    3,
    Math.ceil((pricingBudget * 100) / Math.max(input.binStep, 1)),
  );

  // Asymmetric skew on a clear trend — push the range slightly in the trend
  // direction so the active bin sits closer to the trailing edge.
  const skewBins =
    regime === "trending"
      ? Math.sign(input.price24hChangePct) * Math.ceil(binsEachSide * 0.25)
      : 0;

  // Strategy preset: Curve for tight LP-ing in calm regimes (concentrated
  // liquidity, max fees); Spot for normal; BidAsk for choppy where you want
  // to harvest both sides of an oscillation.
  const strategy_preset: CoachSuggestion["strategy_preset"] =
    regime === "calm" && input.riskTolerance === "Tight"
      ? "Curve"
      : regime === "choppy"
        ? "BidAsk"
        : "Spot";

  const rationaleByRegime: Record<typeof regime, string> = {
    calm: `Pool moved only ±${vol6h.toFixed(2)}% over 6h and ±${vol24h.toFixed(2)}% over 24h — the active bin should hold. A ${binsEachSide}-bin half-width keeps you concentrated where fees actually accrue.`,
    drifting: `Mixed signal — 1h ±${vol1h.toFixed(2)}% but 24h ±${vol24h.toFixed(2)}%. ${binsEachSide} bins each side gives you ~${pricingBudget.toFixed(1)}% of drift cushion across the ${input.arenaDurationHours}h window.`,
    choppy: `1h volatility (±${vol1h.toFixed(2)}%) is outpacing the 6h average — price is oscillating. Wider range (${binsEachSide} bins each side) plus a BidAsk preset captures both legs of the swing.`,
    trending: `Consistent ${input.price24hChangePct >= 0 ? "uptrend" : "downtrend"} (${input.price24hChangePct.toFixed(2)}% over 24h) — range is skewed ${Math.abs(skewBins)} bins ${skewBins > 0 ? "up" : "down"} so the active bin trails behind the move and keeps earning.`,
  };

  const baseRisks: string[] = [];
  if (regime === "trending") {
    baseRisks.push(
      `Trending markets eat one-sided LPs alive — set an auto-exit if price breaks ±${(pricingBudget * 1.5).toFixed(1)}%.`,
    );
  }
  if (regime === "choppy") {
    baseRisks.push(
      "Choppy regimes mean frequent rebalances. If the pool exits this range you'll be paying gas to chase it.",
    );
  }
  if (input.arenaDurationHours >= 48) {
    baseRisks.push(
      `Arena runs ${input.arenaDurationHours}h — longer windows mean larger price drift; your range needs to survive overnight.`,
    );
  }
  if (input.riskTolerance === "Tight") {
    baseRisks.push(
      "Tight presets maximise capital efficiency but only while in range — out-of-range = zero fees.",
    );
  }
  if (baseRisks.length === 0) {
    baseRisks.push(
      "If the pool exits this range, your fees stop accruing until you rebalance.",
    );
  }

  return {
    bin_range_low: input.activeBin - binsEachSide + skewBins,
    bin_range_high: input.activeBin + binsEachSide + skewBins,
    strategy_preset,
    rationale: rationaleByRegime[regime],
    risk_notes: baseRisks,
    stub: true,
  };
}
