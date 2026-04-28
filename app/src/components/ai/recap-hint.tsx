"use client";

import { AiHintFetcher } from "@/components/ai-hint-fetcher";
import type { LpAgentPosition } from "@/lib/lpagent/types";

type RecapResult = {
  final_rank: number;
  did_well: string;
  cost_you_rank: string;
  next_arena_cta: string;
  stub?: boolean;
};

export function RecapHint({
  pubkey,
  history,
  theme = "violet",
}: {
  pubkey: string;
  history: LpAgentPosition[];
  theme?: "emerald" | "orange" | "sky" | "violet";
}) {
  const last = history[0];
  // Synthesize a player vs. winner pair from the most recent closed
  // position. The model handles the storytelling; without history we fall
  // back to the heuristic stub.
  const score = last?.pnl?.percent ?? 0;
  return (
    <AiHintFetcher<RecapResult>
      testId="ai-hint-recap"
      title="Post-season AI recap"
      theme={theme}
      enabled={Boolean(last)}
      endpoint="/api/ai/recap"
      body={{
        player: {
          pubkey,
          finalRank: 2,
          finalScore: score,
          enteredAt: last?.createdAt ?? new Date().toISOString(),
          logs: [],
        },
        winner: {
          pubkey: "WINNERxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          finalScore: score + Math.max(1, Math.abs(score) * 0.5),
          logs: [],
        },
        pool: {
          open: 100,
          high: 105,
          low: 98,
          close: 102,
          hourlyVolatility: 0.012,
        },
      }}
      render={(r) => ({
        body: (
          <div className="space-y-2 text-sm">
            <p>
              <strong>What went right:</strong> {r.did_well}
            </p>
            <p>
              <strong>What cost you rank:</strong> {r.cost_you_rank}
            </p>
          </div>
        ),
        why: <p>{r.next_arena_cta}</p>,
      })}
    />
  );
}
