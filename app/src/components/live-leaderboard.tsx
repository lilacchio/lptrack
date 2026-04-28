"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { LpAgentTopLper } from "@/lib/lpagent/types";
import { fmtPct, fmtUsd } from "@/lib/format";

function shortAddr(a: string): string {
  if (a.length <= 10) return a;
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function pnlClass(n: number): string {
  if (n > 0) return "text-arena-emerald";
  if (n < 0) return "text-destructive";
  return "text-muted-foreground";
}

export function LiveLeaderboard({
  initialLpers,
  poolId,
  arenaPubkey,
  pollMs = 30_000,
}: {
  initialLpers: LpAgentTopLper[];
  poolId: string;
  arenaPubkey?: string;
  pollMs?: number;
}) {
  const [lpers, setLpers] = useState(initialLpers);
  const [tick, setTick] = useState(0);
  const [realtime, setRealtime] = useState<"off" | "live" | "error">("off");

  // Polling fallback — always on, ensures the demo "feels alive" even if
  // Supabase Realtime isn't subscribed (e.g. migrations not applied yet).
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const r = await fetch(`/api/leaderboard/${poolId}`, {
          cache: "no-store",
        });
        const j = (await r.json()) as {
          status: string;
          data?: LpAgentTopLper[];
        };
        if (!cancelled && j.status === "success" && j.data) {
          setLpers(j.data);
          setTick((t) => t + 1);
        }
      } catch {
        // swallow — keep showing the last good snapshot
      }
    }
    const id = setInterval(refresh, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [poolId, pollMs]);

  // Supabase Realtime — opt-in: only subscribes if an arena pubkey is
  // provided (i.e., this is one of OUR arenas, not just a read-only LP
  // Agent pool view).
  useEffect(() => {
    if (!arenaPubkey) return;
    const supa = getBrowserSupabase();
    if (!supa) return;
    const channel = supa
      .channel(`leaderboard:${arenaPubkey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leaderboard",
          filter: `arena_pubkey=eq.${arenaPubkey}`,
        },
        () => setTick((t) => t + 1)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtime("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setRealtime("error");
      });
    return () => {
      supa.removeChannel(channel);
    };
  }, [arenaPubkey]);

  return (
    <Card data-testid="live-leaderboard">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg">Live leaderboard</CardTitle>
          <CardDescription>
            Top LPs ranked by realized PnL — courtesy of LP Agent{" "}
            <code className="font-mono text-xs">
              /pools/{"{id}"}/top-lpers
            </code>
            .
          </CardDescription>
        </div>
        <span
          data-testid="leaderboard-tick"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          {realtime === "live" ? "supabase realtime · " : ""}tick {tick} ·{" "}
          {pollMs / 1000}s
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {lpers.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No LPs reported by LP Agent yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-right">Inflow</th>
                  <th className="px-4 py-3 text-right">PnL</th>
                  <th className="px-4 py-3 text-right">ROI</th>
                  <th className="px-4 py-3 text-right">APR</th>
                  <th className="px-4 py-3 text-right">Win</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {lpers.map((l, i) => (
                    <motion.tr
                      key={l.owner}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, type: "tween" }}
                      data-testid="leaderboard-row"
                      className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          className="font-mono text-xs text-foreground hover:text-arena-sky"
                          href={`https://solscan.io/account/${l.owner}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortAddr(l.owner)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {fmtUsd(l.total_inflow)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-medium ${pnlClass(l.total_pnl)}`}
                      >
                        {l.total_pnl >= 0 ? "+" : ""}
                        {fmtUsd(Math.abs(l.total_pnl))}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${pnlClass(l.roi)}`}
                      >
                        {fmtPct(l.roi * 100)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {fmtPct(l.apr)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {Math.round(l.win_rate * 100)}%
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
