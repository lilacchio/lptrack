import Link from "next/link";
import { LifecyclePill } from "@/components/lifecycle-pill";
import { TokenIcon } from "@/components/token-icon";
import type { ArenaSummary } from "@/lib/chain/arenas";
import { findPoolById, poolInfoTokens } from "@/lib/lpagent/client";
import { arenaThemeFor, fmtUsd } from "@/lib/format";
import type { LpAgentTokenData } from "@/lib/lpagent/types";

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

function formatCountdown(targetMs: number): string {
  const ms = Math.max(0, targetMs - Date.now());
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Server component — fetches LP Agent pool + token metadata for the arena.
 * Designed to be rendered in a grid; resilient to LP Agent failures (falls
 * back to a stripped-down card).
 */
export async function LiveArenaCard({ arena }: { arena: ArenaSummary }) {
  const [pool, tokens] = await Promise.all([
    findPoolById(arena.pool).catch(() => null),
    poolInfoTokens(arena.pool).catch<LpAgentTokenData[]>(() => []),
  ]);

  const theme = arenaThemeFor(arena.pubkey) as keyof typeof ACCENT_BG;
  const pair = pool
    ? `${pool.token0_symbol} · ${pool.token1_symbol}`
    : `${arena.pool.slice(0, 4)}…${arena.pool.slice(-4)}`;
  const t0 = pool ? tokens.find((t) => t.id === pool.token0) : undefined;
  const t1 = pool ? tokens.find((t) => t.id === pool.token1) : undefined;

  const isOpen = arena.lifecycle === "entry_open";
  const isLive = arena.lifecycle === "live";
  const targetTs =
    isOpen ? arena.entryCloseTs : isLive ? arena.endTs : arena.endTs;
  const countdownLabel = isOpen
    ? "entry closes in"
    : isLive
      ? "settles in"
      : arena.lifecycle === "settled"
        ? "ended"
        : arena.lifecycle === "cancelled"
          ? "refunds open"
          : "starts in";

  const ctaHref =
    isOpen || isLive
      ? `/arena/${arena.pubkey}/enter`
      : arena.lifecycle === "settled" || arena.lifecycle === "cancelled"
        ? `/arena/${arena.pubkey}/claim`
        : `/arena/${arena.pubkey}`;
  const ctaLabel =
    arena.lifecycle === "entry_open"
      ? "Enter →"
      : arena.lifecycle === "live"
        ? "View live →"
        : arena.lifecycle === "settled"
          ? "See results →"
          : arena.lifecycle === "cancelled"
            ? "Claim refund →"
            : "View →";

  const entryFeeSol = (arena.entryFeeLamports / 1e9).toFixed(3);

  return (
    <Link
      href={ctaHref}
      className="group block focus-visible:outline-none"
      data-testid="live-arena-card"
    >
      <article
        className={`relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl border border-border bg-card p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-transparent ${ACCENT_GLOW[theme]} group-focus-visible:ring-2 group-focus-visible:ring-ring`}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30 ${ACCENT_BG[theme]}`}
        />

        <header className="flex items-start justify-between gap-2">
          <LifecyclePill lifecycle={arena.lifecycle} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            #{String(arena.index).padStart(3, "0")}
          </span>
        </header>

        <div className="flex items-center gap-3">
          {pool ? (
            <div className="flex -space-x-2">
              <TokenIcon src={t0?.icon} symbol={pool.token0_symbol} size={32} />
              <TokenIcon src={t1?.icon} symbol={pool.token1_symbol} size={32} />
            </div>
          ) : null}
          <h3
            className="font-display text-xl font-medium tracking-tight"
            data-testid="live-arena-pair"
          >
            {pair}
          </h3>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4 text-sm">
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {countdownLabel}
            </dt>
            <dd className="font-medium tabular-nums">
              {arena.lifecycle === "settled" || arena.lifecycle === "cancelled"
                ? `· ${formatRelative(arena.endTs * 1000)}`
                : formatCountdown(targetTs * 1000)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              entry fee
            </dt>
            <dd className="font-medium tabular-nums">{entryFeeSol} SOL</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              entrants
            </dt>
            <dd className="font-medium tabular-nums">
              {arena.currentEntrantCount} / {arena.maxEntrants}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {arena.totalPrizePot > 0 ? "pot paid" : "tvl"}
            </dt>
            <dd className="font-medium tabular-nums">
              {arena.totalPrizePot > 0
                ? `${(arena.totalPrizePot / 1e9).toFixed(3)} SOL`
                : pool
                  ? fmtUsd(pool.tvl)
                  : "—"}
            </dd>
          </div>
        </dl>

        <footer className="flex items-center justify-between text-[11px]">
          <span className="font-mono uppercase tracking-[0.18em] text-muted-foreground">
            on-chain · #{String(arena.index).padStart(3, "0")}
          </span>
          <span
            className={`font-mono transition-transform group-hover:translate-x-1 ${ACCENT_TEXT[theme]}`}
            aria-hidden
          >
            {ctaLabel}
          </span>
        </footer>
      </article>
    </Link>
  );
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
