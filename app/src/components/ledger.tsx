"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LpAgentTopLper } from "@/lib/lpagent/types";
import { fmtPct, fmtUsd } from "@/lib/format";

type LedgerEvent = {
  id: string;
  kind: "rank-up" | "rank-down" | "new" | "exit";
  owner: string;
  ts: number;
  detail: string;
};

function shortAddr(a: string): string {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function diff(prev: LpAgentTopLper[], next: LpAgentTopLper[]): LedgerEvent[] {
  const out: LedgerEvent[] = [];
  const prevIndex = new Map(prev.map((l, i) => [l.owner, i]));
  const nextIndex = new Map(next.map((l, i) => [l.owner, i]));
  const ts = Date.now();

  // New + rank moves
  for (const [owner, ni] of nextIndex.entries()) {
    const pi = prevIndex.get(owner);
    if (pi === undefined) {
      const lp = next[ni];
      out.push({
        id: `${owner}-new-${ts}`,
        kind: "new",
        owner,
        ts,
        detail: `new entry · #${ni + 1} · ${fmtUsd(lp.total_inflow)} in`,
      });
    } else if (ni < pi) {
      const lp = next[ni];
      out.push({
        id: `${owner}-up-${ts}`,
        kind: "rank-up",
        owner,
        ts,
        detail: `↑ to #${ni + 1} (was #${pi + 1}) · ROI ${fmtPct(lp.roi * 100)}`,
      });
    } else if (ni > pi) {
      const lp = next[ni];
      out.push({
        id: `${owner}-down-${ts}`,
        kind: "rank-down",
        owner,
        ts,
        detail: `↓ to #${ni + 1} (was #${pi + 1}) · PnL ${
          lp.total_pnl >= 0 ? "+" : ""
        }${fmtUsd(Math.abs(lp.total_pnl))}`,
      });
    }
  }
  // Exits
  for (const [owner, pi] of prevIndex.entries()) {
    if (!nextIndex.has(owner)) {
      out.push({
        id: `${owner}-exit-${ts}`,
        kind: "exit",
        owner,
        ts,
        detail: `dropped from leaderboard (was #${pi + 1})`,
      });
    }
  }
  return out;
}

const KIND_TONE: Record<LedgerEvent["kind"], string> = {
  "rank-up": "text-arena-emerald",
  "rank-down": "text-destructive",
  new: "text-arena-sky",
  exit: "text-muted-foreground",
};

export function Ledger({
  poolId,
  initialLpers,
  pollMs = 30_000,
}: {
  poolId: string;
  initialLpers: LpAgentTopLper[];
  pollMs?: number;
}) {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const prevRef = useRef<LpAgentTopLper[]>(initialLpers);

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
        if (cancelled || j.status !== "success" || !j.data) return;
        const newEvents = diff(prevRef.current, j.data);
        prevRef.current = j.data;
        if (newEvents.length > 0) {
          setEvents((cur) => [...newEvents, ...cur].slice(0, 20));
        }
      } catch {
        // swallow
      }
    }
    const id = setInterval(refresh, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [poolId, pollMs]);

  return (
    <div
      data-testid="ledger"
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-arena-emerald opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-arena-emerald" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ledger · live
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
      </div>
      {events.length === 0 ? (
        <p
          data-testid="ledger-empty"
          className="font-mono text-xs text-muted-foreground"
        >
          waiting for movement on this pool…
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {events.slice(0, 5).map((e) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                data-testid="ledger-event"
                className="flex items-baseline gap-2 font-mono text-xs"
              >
                <span className={`${KIND_TONE[e.kind]}`}>
                  {shortAddr(e.owner)}
                </span>
                <span className="text-foreground">{e.detail}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
