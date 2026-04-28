import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LpAgentPositionLog } from "@/lib/lpagent/types";

const ACTION_TONE: Record<string, string> = {
  open: "text-arena-emerald",
  increase: "text-arena-emerald",
  add_liquidity: "text-arena-emerald",
  close: "text-destructive",
  decrease: "text-destructive",
  remove_liquidity: "text-destructive",
  claim_fee: "text-arena-sky",
  claim: "text-arena-sky",
};

function fmtAmount(amount: string, decimals: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  const scaled = decimals > 6 ? n / 10 ** decimals : n;
  return scaled < 0.001 ? scaled.toExponential(2) : scaled.toFixed(4);
}

function fmtTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.valueOf())) return ts;
  return d.toISOString().replace("T", " ").slice(0, 16);
}

export function PositionLogsFeed({
  logs,
  testId = "position-logs",
}: {
  logs: LpAgentPositionLog[];
  testId?: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-lg">Activity log</CardTitle>
        <CardDescription>
          Native LP Agent feed —{" "}
          <code className="font-mono text-xs">/lp-positions/logs</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p
            data-testid="position-logs-empty"
            className="font-mono text-xs text-muted-foreground"
          >
            no on-chain activity reported by LP Agent for this owner.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.slice(0, 12).map((l, i) => {
              const tone = ACTION_TONE[l.action] ?? "text-foreground";
              return (
                <li
                  key={`${l.timestamp}-${i}`}
                  data-testid="position-log-row"
                  className="flex items-baseline gap-3 font-mono text-xs"
                >
                  <span className="w-32 shrink-0 text-muted-foreground">
                    {fmtTime(l.timestamp)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${tone} border-current text-[10px]`}
                  >
                    {l.action}
                  </Badge>
                  <span className="text-foreground">
                    {fmtAmount(l.amount0, l.decimal0)} /{" "}
                    {fmtAmount(l.amount1, l.decimal1)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
