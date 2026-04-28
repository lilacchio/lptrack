import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LpAgentPosition } from "@/lib/lpagent/types";
import { fmtPct, fmtUsd } from "@/lib/format";

export function TrophyCase({
  positions,
  title,
  emptyHint,
  testId,
}: {
  positions: LpAgentPosition[];
  title: string;
  emptyHint: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {positions.length} pos
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {positions.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            {emptyHint}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {positions.map((p, i) => {
              const pnl = p.pnl?.value ?? 0;
              const pnlPct = p.pnl?.percent ?? 0;
              const pnlClass =
                pnl > 0
                  ? "text-arena-emerald"
                  : pnl < 0
                    ? "text-destructive"
                    : "text-muted-foreground";
              return (
                <li
                  key={`${p.pool}-${i}`}
                  data-testid="position-row"
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-3 text-sm"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate font-medium">
                      {p.pairName?.trim() || "—"}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {p.strategyType}
                      {p.inRange === false ? " · out of range" : ""}
                    </span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {fmtUsd(p.inputValue)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${pnlClass} border-current font-mono tabular-nums`}
                  >
                    {pnl >= 0 ? "+" : ""}
                    {fmtUsd(Math.abs(pnl))} · {fmtPct(pnlPct)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
