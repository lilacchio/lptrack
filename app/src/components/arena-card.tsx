import Link from "next/link";
import type { LpAgentPool } from "@/lib/lpagent/types";
import { arenaThemeFor, fmtPct, fmtUsd } from "@/lib/format";

const ACCENT_BG: Record<string, string> = {
  emerald: "bg-arena-emerald",
  orange: "bg-arena-orange",
  sky: "bg-arena-sky",
  violet: "bg-arena-violet",
};

const ACCENT_TEXT: Record<string, string> = {
  emerald: "text-arena-emerald",
  orange: "text-arena-orange",
  sky: "text-arena-sky",
  violet: "text-arena-violet",
};

const ACCENT_GLOW: Record<string, string> = {
  emerald: "group-hover:shadow-[0_0_0_1px_var(--arena-emerald)]",
  orange: "group-hover:shadow-[0_0_0_1px_var(--arena-orange)]",
  sky: "group-hover:shadow-[0_0_0_1px_var(--arena-sky)]",
  violet: "group-hover:shadow-[0_0_0_1px_var(--arena-violet)]",
};

export function ArenaCard({ pool }: { pool: LpAgentPool }) {
  const theme = arenaThemeFor(pool.pool);
  const pair = `${pool.token0_symbol} · ${pool.token1_symbol}`;
  const change = pool.price_24h_change ?? 0;
  const changeClass =
    change > 0
      ? "text-arena-emerald"
      : change < 0
        ? "text-destructive"
        : "text-muted-foreground";
  const protocolLabel = pool.protocol.replace("meteora_", "meteora ");

  return (
    <Link
      href={`/arena/${pool.pool}`}
      className="group block focus-visible:outline-none"
      data-testid="arena-card"
    >
      <article
        className={`relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border border-border bg-card p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-transparent ${ACCENT_GLOW[theme]} group-focus-visible:ring-2 group-focus-visible:ring-ring`}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30 ${ACCENT_BG[theme]}`}
        />

        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${ACCENT_BG[theme]}`}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {theme}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {protocolLabel}
          </span>
        </header>

        <div className="flex flex-col gap-1">
          <h3
            className="font-display text-2xl font-medium tracking-tight"
            data-testid="arena-card-pair"
          >
            {pair}
          </h3>
          <span
            className={`font-mono text-xs tabular-nums ${changeClass}`}
            aria-label="24h price change"
          >
            {fmtPct(change)}{" "}
            <span className="text-muted-foreground">· 24h</span>
          </span>
        </div>

        <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4">
          <Stat label="TVL" value={fmtUsd(pool.tvl)} />
          <Stat label="24h vol" value={fmtUsd(pool.vol_24h)} />
        </dl>

        <footer className="flex items-center justify-between text-[11px]">
          <span className="font-mono uppercase tracking-[0.18em] text-muted-foreground">
            view arena
          </span>
          <span
            className={`font-mono transition-transform group-hover:translate-x-1 ${ACCENT_TEXT[theme]}`}
            aria-hidden
          >
            →
          </span>
        </footer>
      </article>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-base font-medium tabular-nums">{value}</dd>
    </div>
  );
}
