import Link from "next/link";
import { Connection } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { ArenaCard } from "@/components/arena-card";
import { FeaturedArenaBanner } from "@/components/featured-arena-banner";
import { HeroBackground } from "@/components/hero-background";
import { LiveArenaCard } from "@/components/live-arena-card";
import { SectionHowItWorks } from "@/components/section-how-it-works";
import { SectionWhyItWorks } from "@/components/section-why-it-works";
import { listArenas, pickFeaturedArena } from "@/lib/chain/arenas";
import { topPoolsByTvl } from "@/lib/lpagent/client";
import { fmtUsd } from "@/lib/format";

export const revalidate = 60;

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

export default async function Home() {
  const [pools, arenas] = await Promise.all([safeTopPools(), safeListArenas()]);
  const featured = pickFeaturedArena(arenas);
  const liveArenas = arenas.filter(
    (a) => a.lifecycle === "entry_open" || a.lifecycle === "live"
  );
  const recentSettled = arenas
    .filter((a) => a.lifecycle === "settled" || a.lifecycle === "cancelled")
    .slice(0, 3);
  const totals = pools.reduce(
    (acc, p) => ({
      tvl: acc.tvl + (p.tvl ?? 0),
      vol: acc.vol + (p.vol_24h ?? 0),
    }),
    { tvl: 0, vol: 0 }
  );
  const totalArenas = arenas.length;

  return (
    <main className="flex w-full flex-col">
      <Hero featuredHref={featured ? `/arena/${featured.pubkey}/enter` : "#arenas"} />

      <section className="relative -mt-20 sm:-mt-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-32">
          <StatStrip
            arenasOnChain={totalArenas}
            tvl={totals.tvl}
            vol24h={totals.vol}
          />

          <FeaturedArenaBanner />

          {liveArenas.length > 0 && (
            <section
              id="arenas"
              className="flex scroll-mt-20 flex-col gap-6"
              data-testid="live-arenas-section"
            >
              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    on-chain · live
                  </span>
                  <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                    Live arenas
                  </h2>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Real on-chain tournaments on the{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      lp_arena
                    </code>{" "}
                    program. Click in to enter or watch.
                  </p>
                </div>
                <Link
                  href="/arenas"
                  className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground sm:inline"
                >
                  archive →
                </Link>
              </div>
              <div
                data-testid="live-arena-grid"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {liveArenas.slice(0, 6).map((a) => (
                  <LiveArenaCard key={a.pubkey} arena={a} />
                ))}
              </div>
            </section>
          )}

          {recentSettled.length > 0 && (
            <section className="flex flex-col gap-6">
              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    archive
                  </span>
                  <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                    Recently settled
                  </h2>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Arenas that have called the bell. Top three already paid
                    out on-chain.
                  </p>
                </div>
                <Link
                  href="/arenas"
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  view all →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentSettled.map((a) => (
                  <LiveArenaCard key={a.pubkey} arena={a} />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-6">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  the field
                </span>
                <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
                  Top Meteora pools
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  The pools your arenas run on top of — scored by{" "}
                  <span className="text-foreground">LP Agent</span> every
                  minute.
                </p>
              </div>
              {pools.length > 0 && (
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
                  {pools.length} pools · refresh 60s
                </span>
              )}
            </div>

            {pools.length === 0 ? (
              <div
                data-testid="arena-grid-empty"
                className="rounded-3xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground"
              >
                LP Agent isn&rsquo;t responding right now. Try again in a
                minute.
              </div>
            ) : (
              <div
                data-testid="arena-grid"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                {pools.map((p) => (
                  <ArenaCard key={p.pool} pool={p} />
                ))}
              </div>
            )}
          </section>

          <SectionHowItWorks />

          <SectionWhyItWorks />

          <ClosingCta featuredHref={featured ? `/arena/${featured.pubkey}/enter` : "#arenas"} />
        </div>
      </section>
    </main>
  );
}

function Hero({ featuredHref }: { featuredHref: string }) {
  return (
    <section className="relative isolate -mt-px flex min-h-[calc(100svh-3.5rem)] flex-col justify-end overflow-hidden bg-[#070912] text-white">
      <HeroBackground />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#070912]/90 via-[#070912]/40 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-[55%] bg-gradient-to-t from-background via-[#070912]/85 to-transparent"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-28 pt-32 sm:pb-36 sm:pt-40">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-arena-emerald opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-arena-emerald" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/70">
              devnet · live judging arena
            </span>
          </div>

          <h1 className="font-display text-balance text-5xl font-light leading-[1.02] tracking-[-0.02em] text-white sm:text-7xl lg:text-[88px]">
            LPing is a{" "}
            <em className="italic text-arena-emerald [font-feature-settings:'ss01']">
              sport
            </em>{" "}
            now.
          </h1>

          <p className="max-w-xl text-balance text-base text-white/70 sm:text-lg">
            Compete head-to-head on Meteora pools. Real positions, scored live by{" "}
            <span className="text-white">LP Agent</span>. Settled on a Solana
            prize-pot Anchor program. Top three split the pot.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              nativeButton={false}
              className="rounded-full !bg-white px-7 !text-[#070912] hover:!bg-white/85 hover:!text-[#070912]"
              render={<Link href={featuredHref} />}
            >
              Enter the arena →
            </Button>
            <Button
              size="lg"
              variant="ghost"
              nativeButton={false}
              className="rounded-full border border-white/20 px-6 text-white/85 hover:bg-white/10 hover:text-white"
              render={<Link href="#arenas" />}
            >
              Browse the field
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 text-[11px] text-white/55">
            <Pill label="Anchor" value="devnet" />
            <Pill label="Scoring" value="LP Agent · 60s" />
            <Pill label="Settlement" value="Ed25519 · on-chain" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
      <span className="font-mono uppercase tracking-[0.2em] text-white/45">
        {label}
      </span>
      <span className="text-white/85">{value}</span>
    </span>
  );
}

function StatStrip({
  arenasOnChain,
  tvl,
  vol24h,
}: {
  arenasOnChain: number;
  tvl: number;
  vol24h: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border shadow-sm sm:grid-cols-4">
      <Stat
        label="Arenas on-chain"
        value={arenasOnChain.toString().padStart(2, "0")}
      />
      <Stat label="Pool TVL tracked" value={fmtUsd(tvl)} />
      <Stat label="24h pool volume" value={fmtUsd(vol24h)} />
      <Stat label="Settlement" value="on-chain" hint="Ed25519 oracle" />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-card px-6 py-5">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-2xl font-medium tabular-nums tracking-tight">
        {value}
      </span>
      {hint && (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

function ClosingCta({ featuredHref }: { featuredHref: string }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[#070912] px-8 py-16 text-white sm:px-14 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-arena-emerald opacity-15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-arena-violet opacity-15 blur-3xl"
      />
      <div className="relative flex flex-col items-start gap-6 sm:items-center sm:text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/55">
          the bell rings every 24 hours
        </span>
        <h2 className="max-w-2xl font-display text-balance text-4xl font-light leading-[1.05] tracking-[-0.01em] sm:text-6xl">
          The next arena is{" "}
          <em className="italic text-arena-emerald">already</em> open.
        </h2>
        <p className="max-w-lg text-balance text-base text-white/70">
          Pot tier 0.025 SOL · top three split 50/30/20 · settles on devnet.
        </p>
        <Button
          size="lg"
          nativeButton={false}
          className="rounded-full !bg-white px-7 !text-[#070912] hover:!bg-white/85 hover:!text-[#070912]"
          render={<Link href={featuredHref} />}
        >
          Enter the arena →
        </Button>
      </div>
    </section>
  );
}

async function safeTopPools() {
  try {
    return await topPoolsByTvl(8);
  } catch (err) {
    // Warn (not error) so transient 429s / network blips don't dominate the
    // dev overlay. Page degrades gracefully to "no pools" — the rest of the
    // home (live arenas, archive, copy) still renders.
    console.warn("[home] topPoolsByTvl failed:", (err as Error).message);
    return [];
  }
}

async function safeListArenas() {
  try {
    const conn = new Connection(RPC, "confirmed");
    return await listArenas(conn);
  } catch (err) {
    console.warn("[home] listArenas failed:", (err as Error).message);
    return [];
  }
}
