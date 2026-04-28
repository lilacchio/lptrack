"use client";

import { AiHintFetcher } from "@/components/ai-hint-fetcher";
import type { LpAgentTopLper } from "@/lib/lpagent/types";

type RivalsResult = {
  rivals: Array<{
    owner: string;
    rank: number;
    headline: string;
    detail: string;
  }>;
  stub?: boolean;
};

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

export function RivalsHint({
  arenaPoolId,
  lpers,
  theme = "sky",
}: {
  arenaPoolId: string;
  lpers: LpAgentTopLper[];
  theme?: "emerald" | "orange" | "sky" | "violet";
}) {
  const rivals = lpers.slice(0, 3).map((l, i) => ({
    owner: l.owner,
    rank: i + 1,
    recentLogs: [
      {
        ts: l.last_activity ?? new Date().toISOString(),
        kind: "rebalance",
        detail: `roi ${(l.roi * 100).toFixed(2)}% · pnl ${l.total_pnl.toFixed(
          2
        )}`,
      },
    ],
  }));

  return (
    <AiHintFetcher<RivalsResult>
      testId="ai-hint-rivals"
      title="Rival Scout · top 3"
      theme={theme}
      enabled={rivals.length > 0}
      endpoint="/api/ai/rivals"
      body={{ arenaPoolId, rivals }}
      render={(r) => ({
        body: (
          <ul className="space-y-1">
            {r.rivals.map((rv) => (
              <li key={rv.owner} className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  #{rv.rank} {shortAddr(rv.owner)}
                </span>{" "}
                {rv.headline}
              </li>
            ))}
          </ul>
        ),
        why: (
          <ul className="space-y-1">
            {r.rivals.map((rv) => (
              <li key={`${rv.owner}-d`}>{rv.detail}</li>
            ))}
          </ul>
        ),
      })}
    />
  );
}
