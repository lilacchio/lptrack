"use client";

import { AiHintFetcher } from "@/components/ai-hint-fetcher";

type CoachResult = {
  bin_range_low: number;
  bin_range_high: number;
  strategy_preset: string;
  rationale: string;
  risk_notes: string[];
  stub?: boolean;
};

export function EntryCoachHint({
  poolId,
  binStep,
  price1hChangePct,
  price6hChangePct,
  price24hChangePct,
  arenaDurationHours = 168,
  theme = "violet",
}: {
  poolId: string;
  binStep: number;
  price1hChangePct: number;
  price6hChangePct: number;
  price24hChangePct: number;
  arenaDurationHours?: number;
  theme?: "emerald" | "orange" | "sky" | "violet";
}) {
  return (
    <AiHintFetcher<CoachResult>
      testId="ai-hint-coach"
      title="AI Coach · suggested range"
      theme={theme}
      endpoint="/api/ai/coach"
      body={{
        poolId,
        activeBin: 0,
        binStep,
        price1hChangePct,
        price6hChangePct,
        price24hChangePct,
        arenaDurationHours,
        riskTolerance: "Balanced",
      }}
      render={(r) => ({
        body: (
          <div className="space-y-2">
            <div>
              <code className="font-mono text-xs">
                bins {r.bin_range_low} → {r.bin_range_high}
              </code>{" "}
              <span className="text-xs text-muted-foreground">
                · preset {r.strategy_preset}
              </span>
            </div>
            <p className="text-sm">{r.rationale}</p>
          </div>
        ),
        why: (
          <ul className="list-disc pl-4 space-y-1">
            {r.risk_notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ),
      })}
    />
  );
}
