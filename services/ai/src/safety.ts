import type { SafetyInspection } from "./schemas";

export type SafetyInput = {
  organicScore: number; // 0..100
  topHolderPct: number; // 0..100
  mintFreeze: boolean;
  ageHours: number;
  gate: {
    minOrganicScoreBps: number;
    maxTopHolderBps: number;
    requireMintFreeze: boolean;
  };
  autoExitEnabled: boolean;
};

export type SafetyResult = SafetyInspection & { stub: boolean };

export async function getSafetyInspection(
  input: SafetyInput,
): Promise<SafetyResult> {
  return scenarioSafety(input);
}

function scenarioSafety(input: SafetyInput): SafetyResult {
  const organicBps = Math.round(input.organicScore * 100);
  const topHolderBps = Math.round(input.topHolderPct * 100);
  const flags = [
    {
      label: "Organic score",
      value: `${input.organicScore.toFixed(1)}`,
      threshold: `≥ ${(input.gate.minOrganicScoreBps / 100).toFixed(1)}`,
      breached: organicBps < input.gate.minOrganicScoreBps,
    },
    {
      label: "Top holder",
      value: `${input.topHolderPct.toFixed(1)}%`,
      threshold: `≤ ${(input.gate.maxTopHolderBps / 100).toFixed(1)}%`,
      breached: topHolderBps > input.gate.maxTopHolderBps,
    },
    {
      label: "Mint frozen",
      value: input.mintFreeze ? "yes" : "no",
      threshold: input.gate.requireMintFreeze ? "required" : "optional",
      breached: input.gate.requireMintFreeze && !input.mintFreeze,
    },
    {
      label: "Pool age",
      value: `${input.ageHours.toFixed(1)}h`,
      threshold: "≥ 24h",
      breached: input.ageHours < 24,
    },
  ];
  const breachedCount = flags.filter((f) => f.breached).length;

  // Rating branches on the worst signal, not just the count, so a single
  // catastrophic flag (top-holder concentration) outranks two minor ones.
  const rating: SafetyInspection["rating"] =
    input.topHolderPct > 30 || breachedCount >= 3
      ? "critical"
      : input.topHolderPct > 20 || breachedCount === 2
        ? "high"
        : breachedCount === 1 || input.ageHours < 24 || input.topHolderPct >= 10
          ? "moderate"
          : "low";

  // Summary varies by which specific flag is worst, plus a tail sentence
  // that depends on auto-exit state and overall rating.
  const worst = flags.find((f) => f.breached);
  const ratingLabel = `${rating[0].toUpperCase()}${rating.slice(1)} risk`;
  let summaryHead: string;
  if (!worst) {
    if (rating === "low") {
      summaryHead = `${ratingLabel} — every gate threshold cleared with margin.`;
    } else if (input.ageHours < 24) {
      summaryHead = `${ratingLabel} — gates pass but the pool is only ${input.ageHours.toFixed(1)}h old; treat as unproven.`;
    } else {
      summaryHead = `${ratingLabel} — top holder at ${input.topHolderPct.toFixed(1)}% is below the breach line but worth watching.`;
    }
  } else if (worst.label === "Top holder") {
    summaryHead = `${ratingLabel} — a single wallet holds ${worst.value} of supply. That wallet can dump the pool.`;
  } else if (worst.label === "Organic score") {
    summaryHead = `${ratingLabel} — organic score ${worst.value} is below threshold (${worst.threshold}); volume is heavily wash-traded or low-quality.`;
  } else if (worst.label === "Pool age") {
    summaryHead = `${ratingLabel} — pool is only ${worst.value} old; no track record yet.`;
  } else if (worst.label === "Mint frozen") {
    summaryHead = `${ratingLabel} — mint authority is still active. The token supply can be inflated.`;
  } else {
    summaryHead = `${ratingLabel} — ${worst.label.toLowerCase()} is ${worst.value} (threshold ${worst.threshold}).`;
  }

  const summaryTail = input.autoExitEnabled
    ? rating === "critical" || rating === "high"
      ? " Auto-exit is enabled — if any metric degrades further the arena cancels and everyone gets refunded."
      : " Auto-exit is enabled, so a sudden degradation in these metrics triggers a cancel + refund."
    : rating === "critical" || rating === "high"
      ? " Auto-exit is OFF — without it, you'll need to claim a refund manually if the pool degrades."
      : "";

  return {
    stub: true,
    rating,
    summary: summaryHead + summaryTail,
    flags,
  };
}
