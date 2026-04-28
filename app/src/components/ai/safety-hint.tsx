"use client";

import { AiHintFetcher } from "@/components/ai-hint-fetcher";

type SafetyResult = {
  rating: "low" | "moderate" | "high" | "critical";
  summary: string;
  flags: Array<{
    label: string;
    value: string;
    threshold: string;
    breached: boolean;
  }>;
  stub?: boolean;
};

const RATING_THEME: Record<SafetyResult["rating"], "emerald" | "orange" | "violet"> = {
  low: "emerald",
  moderate: "violet",
  high: "orange",
  critical: "orange",
};

export function SafetyHint({
  organicScore,
  topHolderPct,
  mintFreeze,
  ageHours,
  themeOverride,
}: {
  organicScore: number;
  topHolderPct: number;
  mintFreeze: boolean;
  ageHours: number;
  themeOverride?: "emerald" | "orange" | "sky" | "violet";
}) {
  return (
    <AiHintFetcher<SafetyResult>
      testId="ai-hint-safety"
      title="Pool safety inspection"
      theme={themeOverride ?? "orange"}
      endpoint="/api/ai/safety"
      body={{
        organicScore,
        topHolderPct,
        mintFreeze,
        ageHours,
        gate: {
          minOrganicScoreBps: 7000,
          maxTopHolderBps: 2000,
          requireMintFreeze: false,
        },
        autoExitEnabled: true,
      }}
      render={(r) => ({
        body: (
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              rating · {r.rating}
            </div>
            <p className="text-sm">{r.summary}</p>
          </div>
        ),
        why: (
          <ul className="space-y-1">
            {r.flags.map((f, i) => (
              <li
                key={i}
                className={f.breached ? "text-destructive" : "text-foreground"}
              >
                {f.label}: {f.value} (limit {f.threshold})
                {f.breached ? " — BREACHED" : ""}
              </li>
            ))}
          </ul>
        ),
      })}
    />
  );
}

// Suppress unused warning if a caller doesn't need RATING_THEME.
void RATING_THEME;
