import Link from "next/link";
import { Connection } from "@solana/web3.js";
import { LifecyclePill } from "@/components/lifecycle-pill";
import { TokenIcon } from "@/components/token-icon";
import { listArenas, pickFeaturedArena } from "@/lib/chain/arenas";
import { findPoolById, poolInfoTokens } from "@/lib/lpagent/client";
import { arenaThemeFor, fmtUsd } from "@/lib/format";

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

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

/**
 * Picks the latest entry-open arena (or the latest live arena, or the latest
 * settled arena) from on-chain state and surfaces it as a banner on the home
 * page. Returns null when no arenas exist yet (cold-start / pre-spawn-cron).
 */
export async function FeaturedArenaBanner() {
  let arena;
  try {
    const conn = new Connection(RPC, "confirmed");
    const arenas = await listArenas(conn);
    arena = pickFeaturedArena(arenas);
  } catch (err) {
    console.error("[home] featured arena lookup failed:", err);
    return null;
  }
  if (!arena) return null;

  const [pool, tokens] = await Promise.all([
    findPoolById(arena.pool).catch(() => null),
    poolInfoTokens(arena.pool).catch(() => []),
  ]);
  if (!pool) return null;

  const t0 = tokens.find((t) => t.id === pool.token0);
  const t1 = tokens.find((t) => t.id === pool.token1);
  const theme = arenaThemeFor(arena.pubkey);
  const pair = `${pool.token0_symbol} · ${pool.token1_symbol}`;

  const isOpen = arena.lifecycle === "entry_open";
  const isLive = arena.lifecycle === "live";
  const ctaHref =
    isOpen || isLive
      ? `/arena/${arena.pubkey}/enter`
      : `/arena/${arena.pubkey}`;
  const ctaLabel = isOpen ? "Enter" : isLive ? "Watch live" : "See results";
  const entryFeeSol = (arena.entryFeeLamports / 1e9).toFixed(3);
  const endsLabel = new Date(arena.endTs * 1000).toISOString().slice(0, 10);

  return (
    <Link
      href={ctaHref}
      data-testid="featured-arena-banner"
      className="group block focus-visible:outline-none"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1 ${ACCENT_BG[theme]}`}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <TokenIcon src={t0?.icon} symbol={pool.token0_symbol} size={40} />
              <TokenIcon src={t1?.icon} symbol={pool.token1_symbol} size={40} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <LifecyclePill lifecycle={arena.lifecycle} />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  ends {endsLabel}
                </span>
              </div>
              <div className="font-display text-2xl font-medium tracking-tight">
                {pair}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                entry {entryFeeSol} SOL · top-3 split 50/30/20 · TVL{" "}
                {fmtUsd(pool.tvl)}
              </div>
            </div>
          </div>
          <span
            className={`font-mono text-xs ${ACCENT_TEXT[theme]} transition-transform group-hover:translate-x-1`}
          >
            {ctaLabel} →
          </span>
        </div>
      </div>
    </Link>
  );
}
