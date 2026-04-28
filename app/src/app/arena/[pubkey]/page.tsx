import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Connection, PublicKey } from "@solana/web3.js";
import { ArenaCountdown } from "@/components/arena-countdown";
import { Ledger } from "@/components/ledger";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { RivalsHint } from "@/components/ai/rivals-hint";
import { SafetyHint } from "@/components/ai/safety-hint";
import { TokenIcon } from "@/components/token-icon";
import { fetchArena } from "@/lib/chain/program";
import { deriveArenaLifecycle, type ArenaLifecycle } from "@/lib/chain/arenas";
import { LifecyclePill } from "@/components/lifecycle-pill";
import {
  findPoolById,
  poolInfoTokens,
  poolOnchainStats,
  poolPositions,
  poolTopLpers,
} from "@/lib/lpagent/client";
import type { LpAgentTokenData } from "@/lib/lpagent/types";
import { arenaThemeFor, fmtPct, fmtUsd } from "@/lib/format";

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const FEATURED_ARENA_POOL = process.env.NEXT_PUBLIC_FEATURED_ARENA_POOL;
const FEATURED_ARENA = process.env.NEXT_PUBLIC_FEATURED_ARENA;

async function tryFetchFeaturedArenaForPool(poolId: string) {
  if (!FEATURED_ARENA || !FEATURED_ARENA_POOL || poolId !== FEATURED_ARENA_POOL) {
    return null;
  }
  try {
    const conn = new Connection(RPC, "confirmed");
    return await fetchArena(conn, new PublicKey(FEATURED_ARENA));
  } catch {
    return null;
  }
}

async function tryResolveArenaPda(pubkey: string) {
  let pk: PublicKey;
  try {
    pk = new PublicKey(pubkey);
  } catch {
    return null;
  }
  try {
    const conn = new Connection(RPC, "confirmed");
    const arena = await fetchArena(conn, pk);
    if (!arena) return null;
    return { arena, poolId: arena.pool.toBase58(), arenaPda: pubkey };
  } catch {
    return null;
  }
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}): Promise<Metadata> {
  const { pubkey } = await params;
  const arenaResolution = await tryResolveArenaPda(pubkey);
  const poolId = arenaResolution?.poolId ?? pubkey;
  const pool = await findPoolById(poolId).catch(() => null);
  const pair = pool
    ? `${pool.token0_symbol} · ${pool.token1_symbol}`
    : "Arena";
  const title = `${pair} — LP Arena`;
  const description = pool
    ? `${pool.protocol.replace("meteora_", "meteora ")} arena · scored live by LP Agent.`
    : "Scored live by LP Agent.";
  const ogUrl = `/og/arena/${pubkey}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

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

const ACCENT_RING: Record<string, string> = {
  emerald: "ring-arena-emerald/30",
  orange: "ring-arena-orange/30",
  sky: "ring-arena-sky/30",
  violet: "ring-arena-violet/30",
};

export default async function ArenaDetail({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;

  const arenaResolution = await tryResolveArenaPda(pubkey);
  const poolId = arenaResolution?.poolId ?? pubkey;

  const [pool, lpers, stats, tokens, positions] = await Promise.all([
    findPoolById(poolId).catch(() => null),
    poolTopLpers(poolId, { pageSize: 10 }).catch(() => []),
    poolOnchainStats(poolId).catch(() => null),
    poolInfoTokens(poolId).catch<LpAgentTokenData[]>(() => []),
    poolPositions(poolId, { pageSize: 5, status: "Open" }).catch(() => ({
      positions: [],
      total: 0,
      prices: {},
    })),
  ]);

  if (!pool) notFound();

  const liveArena =
    arenaResolution?.arena ?? (await tryFetchFeaturedArenaForPool(pool.pool));
  const liveArenaPda = arenaResolution?.arenaPda ?? FEATURED_ARENA;
  const arenaEndMs = liveArena ? Number(liveArena.endTs) * 1000 : null;
  const lifecycle: ArenaLifecycle | null = liveArena
    ? deriveArenaLifecycle(
        readArenaStateName(liveArena.state),
        Number(liveArena.entryOpenTs),
        Number(liveArena.entryCloseTs),
        Math.floor(Date.now() / 1000)
      )
    : null;

  const t0 = tokens.find((t) => t.id === pool.token0);
  const t1 = tokens.find((t) => t.id === pool.token1);

  const theme = arenaThemeFor(pool.pool);
  const pair = `${pool.token0_symbol} · ${pool.token1_symbol}`;
  const change = pool.price_24h_change ?? 0;
  const changeClass =
    change > 0
      ? "text-arena-emerald"
      : change < 0
        ? "text-destructive"
        : "text-muted-foreground";

  const enterHref = `/arena/${liveArenaPda ?? pubkey}/enter`;
  const claimHref = `/arena/${liveArenaPda ?? pubkey}/claim`;
  const isClaimable = lifecycle === "settled" || lifecycle === "cancelled";
  const primaryCtaHref = isClaimable ? claimHref : enterHref;
  const primaryCtaLabel = isClaimable
    ? lifecycle === "cancelled"
      ? "Claim refund →"
      : "Claim payout →"
    : "Enter arena →";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-32 pt-10">
      <nav className="flex items-center justify-between text-sm">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← all arenas
        </Link>
        <a
          href={`https://solscan.io/account/${pool.pool}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          solscan · {pool.pool.slice(0, 8)}…{pool.pool.slice(-6)} ↗
        </a>
      </nav>

      <header
        className={`relative overflow-hidden rounded-[2rem] border border-border bg-[#070912] p-8 text-white shadow-xl sm:p-12`}
      >
        {/* Themed accent blooms */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl ${ACCENT_BG[theme]}`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 h-[20rem] w-[20rem] rounded-full bg-white/5 blur-3xl"
        />
        {/* Top hairline */}
        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 h-px ${ACCENT_BG[theme]} opacity-80`}
        />

        <div className="relative flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-3">
            {lifecycle && <LifecyclePill lifecycle={lifecycle} />}
            <Badge
              variant="outline"
              className={`${ACCENT_TEXT[theme]} border-current bg-white/5 font-mono text-[10px] backdrop-blur`}
            >
              {theme} arena
            </Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
              {pool.protocol.replace("meteora_", "meteora ")}
            </span>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-5">
                <div
                  className={`flex -space-x-3 rounded-full bg-white/5 p-1.5 ring-2 ring-inset ${ACCENT_RING[theme]}`}
                >
                  <TokenIcon
                    src={t0?.icon}
                    symbol={pool.token0_symbol}
                    size={56}
                  />
                  <TokenIcon
                    src={t1?.icon}
                    symbol={pool.token1_symbol}
                    size={56}
                  />
                </div>
                <h1
                  data-testid="arena-pair"
                  className="font-display text-balance text-5xl font-light leading-[1] tracking-[-0.02em] sm:text-6xl"
                >
                  {pair}
                </h1>
              </div>
              <SafetyRow t0={t0} t1={t1} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                nativeButton={false}
                className="rounded-full !bg-white px-7 !text-[#070912] hover:!bg-white/85 hover:!text-[#070912]"
                render={<Link href={primaryCtaHref} />}
              >
                {primaryCtaLabel}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                nativeButton={false}
                className="rounded-full border border-white/20 px-6 text-white/85 hover:bg-white/10 hover:text-white"
                render={
                  <a
                    href={`https://app.meteora.ag/dlmm/${pool.pool}`}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                Open on Meteora ↗
              </Button>
            </div>
          </div>

          {arenaEndMs && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <ArenaCountdown endTsMs={arenaEndMs} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            <HeroStat label="TVL" value={fmtUsd(pool.tvl)} />
            <HeroStat label="24h volume" value={fmtUsd(pool.vol_24h)} />
            <HeroStat
              label="24h Δ price"
              value={fmtPct(change)}
              valueClass={changeClass}
            />
            <HeroStat label="Fee" value={`${pool.fee.toFixed(2)}%`} />
          </div>
        </div>
      </header>

      <SectionShell
        eyebrow="activity ledger"
        title="What's moving right now"
        body="Synthesized from LP Agent leaderboard diffs every 30 seconds."
      >
        <Ledger poolId={pool.pool} initialLpers={lpers} />
      </SectionShell>

      <SectionShell
        eyebrow="safety inspection"
        title="Is this pool worth holding?"
        body="LP Agent's organic-score, top-holder concentration, and mint-freeze flags read like a bill of health."
      >
        <SafetyHint
          organicScore={pool.organic_score}
          topHolderPct={pool.top_holder * 100}
          mintFreeze={pool.mint_freeze}
          ageHours={Math.max(
            1,
            (Date.now() -
              new Date(pool.first_pool_created_at).valueOf()) /
              36e5
          )}
          themeOverride={theme as "emerald" | "orange" | "sky" | "violet"}
        />
      </SectionShell>

      <SectionShell
        eyebrow="the field"
        title="Live leaderboard"
        body="Top LPs ranked by realized + unrealized PnL. Re-scored every minute by LP Agent."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <LiveLeaderboard
            initialLpers={lpers}
            poolId={pool.pool}
            arenaPubkey={liveArena ? liveArenaPda : undefined}
          />

          <article
            data-testid="onchain-stats"
            className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-border bg-card p-6"
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-15 blur-3xl ${ACCENT_BG[theme]}`}
            />
            <header className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                on-chain pulse
              </span>
              <h3 className="font-display text-xl font-medium tracking-tight">
                Right now in the pool
              </h3>
              <p className="text-xs text-muted-foreground">
                LP Agent{" "}
                <code className="font-mono">/pools/{"{id}"}/onchain-stats</code>
              </p>
            </header>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border/60 pt-5">
              <PulseStat
                label="Open positions"
                value={
                  stats ? stats.total_open_positions.toLocaleString() : "—"
                }
              />
              <PulseStat
                label="Unique LPs"
                value={stats ? stats.unique_owners.toLocaleString() : "—"}
              />
              <PulseStat
                label="Input value"
                value={stats ? fmtUsd(stats.total_input_value) : "—"}
              />
              <PulseStat
                label="Input native"
                value={
                  stats
                    ? `${stats.total_input_native.toFixed(2)} SOL`
                    : "—"
                }
              />
              <PulseStat
                label="Tracked positions"
                value={
                  positions.total > 0
                    ? positions.total.toLocaleString()
                    : positions.positions.length.toLocaleString()
                }
              />
              <PulseStat
                label="Sample top owner"
                value={
                  positions.positions[0]?.owner
                    ? `${positions.positions[0].owner.slice(0, 4)}…${positions.positions[0].owner.slice(-4)}`
                    : "—"
                }
              />
            </dl>
          </article>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="rivals"
        title="Who's hunting your spot"
        body="Coach intel on the top three by realized PnL — pulled from LP Agent's pool-leaders endpoint, narrated by the AI Coach."
      >
        <RivalsHint arenaPoolId={pool.pool} lpers={lpers} theme="sky" />
      </SectionShell>
    </main>
  );
}

function readArenaStateName(s: unknown): string {
  if (typeof s === "number") {
    return ["Pending", "Active", "Settling", "Completed", "Cancelled"][s] ?? "Pending";
  }
  if (typeof s === "object" && s !== null) {
    const k = Object.keys(s as Record<string, unknown>)[0] ?? "pending";
    return k.charAt(0).toUpperCase() + k.slice(1);
  }
  return "Pending";
}

function SectionShell({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </span>
        <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
          {title}
        </h2>
        {body && (
          <p className="max-w-2xl text-sm text-muted-foreground">{body}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function HeroStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-[#070912] px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </span>
      <span
        className={`font-display text-2xl font-medium tabular-nums tracking-tight text-white ${valueClass ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function PulseStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-base font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function SafetyRow({
  t0,
  t1,
}: {
  t0?: LpAgentTokenData;
  t1?: LpAgentTokenData;
}) {
  const tokens = [t0, t1].filter(Boolean) as LpAgentTokenData[];
  if (tokens.length === 0) return null;

  return (
    <div
      data-testid="safety-row"
      className="flex flex-wrap items-center gap-2"
    >
      {tokens.map((t) => {
        const score = t.organicScore ?? 0;
        const label = t.organicScoreLabel ?? "—";
        const tone =
          label === "high"
            ? "text-arena-emerald"
            : label === "medium"
              ? "text-arena-orange"
              : "text-destructive";
        return (
          <Badge
            key={t.id}
            variant="outline"
            className={`${tone} border-current bg-white/5 font-mono text-[10px] backdrop-blur`}
            title={`Organic score for ${t.symbol} (LP Agent /pools/{id}/info)`}
          >
            {t.symbol} · {label} ({Math.round(score)})
            {t.isVerified ? " ✓" : ""}
          </Badge>
        );
      })}
    </div>
  );
}
