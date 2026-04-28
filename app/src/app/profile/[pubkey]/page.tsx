import type { Metadata } from "next";
import Link from "next/link";
import { EquityCurve, type EquityPoint } from "@/components/equity-curve";
import { TrophyCase } from "@/components/trophy-case";
import { PositionLogsFeed } from "@/components/position-logs-feed";
import { RecapHint } from "@/components/ai/recap-hint";
import {
  ownerHistoricalPositions,
  ownerOpenPositions,
  ownerOverview,
  ownerRevenue,
  positionLogs,
} from "@/lib/lpagent/client";
import type { LpAgentRevenuePoint } from "@/lib/lpagent/types";
import { arenaThemeFor, fmtPct, fmtUsd } from "@/lib/format";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}): Promise<Metadata> {
  const { pubkey } = await params;
  const short =
    pubkey.length > 12 ? `${pubkey.slice(0, 6)}…${pubkey.slice(-6)}` : pubkey;
  const title = `${short} · LP Arena profile`;
  const description = `Lifetime LP performance for ${short}, scored live by LP Agent.`;
  const ogUrl = `/og/profile/${pubkey}`;
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

function shortAddr(a: string): string {
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-6)}`;
}

function pickNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function revenueToEquity(points: LpAgentRevenuePoint[]): EquityPoint[] {
  let cum = 0;
  return points.map((p) => {
    const pnl = pickNumber(p.pnl);
    cum += pnl;
    return { date: p.date, pnl: cum };
  });
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;

  const [overviewArr, openPositions, history, revenue, logs] =
    await Promise.all([
      ownerOverview(pubkey).catch(() => []),
      ownerOpenPositions(pubkey, { pageSize: 8 }).catch(() => []),
      ownerHistoricalPositions(pubkey, { pageSize: 8 }).catch(() => []),
      ownerRevenue(pubkey, "1M").catch(() => []),
      positionLogs({ owner: pubkey }).catch(() => []),
    ]);

  const overview = overviewArr[0];
  const lifetimePnl = overview?.total_pnl?.ALL ?? 0;
  const lifetimeFee = overview?.total_fee?.ALL ?? 0;
  const lifetimeInflow = overview?.total_inflow ?? 0;
  const roi = lifetimeInflow > 0 ? (lifetimePnl / lifetimeInflow) * 100 : 0;
  const theme = arenaThemeFor(pubkey) as keyof typeof ACCENT_BG;

  const initial = (() => {
    const c = pubkey.charAt(0).toUpperCase();
    return /[A-Z0-9]/.test(c) ? c : "·";
  })();

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
          href={`https://solscan.io/account/${pubkey}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          solscan · {shortAddr(pubkey)} ↗
        </a>
      </nav>

      <header
        className={`relative overflow-hidden rounded-[2rem] border border-border bg-[#070912] p-8 text-white shadow-xl sm:p-12`}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl ${ACCENT_BG[theme]}`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 h-[20rem] w-[20rem] rounded-full bg-white/5 blur-3xl"
        />
        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 h-px ${ACCENT_BG[theme]} opacity-80`}
        />

        <div className="relative flex flex-col gap-8">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] backdrop-blur">
            <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_BG[theme]}`} />
            <span className="font-mono uppercase tracking-[0.22em] text-white/75">
              profile · lifetime
            </span>
          </span>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-5">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-2 ring-inset ${ACCENT_RING[theme]}`}
              >
                <span
                  className={`font-display text-2xl font-medium ${ACCENT_TEXT[theme]}`}
                >
                  {initial}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h1
                  data-testid="profile-pubkey"
                  className="font-display text-balance text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl"
                >
                  {shortAddr(pubkey)}
                </h1>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                  meteora lp · solana mainnet
                </span>
              </div>
            </div>
          </div>

          <div
            data-testid="profile-kpis"
            className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4"
          >
            <HeroKpi
              label="Lifetime PnL"
              value={`${lifetimePnl >= 0 ? "+" : ""}${fmtUsd(Math.abs(lifetimePnl))}`}
              tone={
                lifetimePnl > 0 ? "win" : lifetimePnl < 0 ? "loss" : "neutral"
              }
            />
            <HeroKpi label="Lifetime ROI" value={fmtPct(roi)} />
            <HeroKpi label="Fees collected" value={fmtUsd(lifetimeFee)} />
            <HeroKpi
              label="Open positions"
              value={openPositions.length.toString().padStart(2, "0")}
            />
          </div>
        </div>
      </header>

      <SectionShell
        eyebrow="equity curve"
        title="Cumulative PnL — last 30 days."
        body={
          <>
            From LP Agent{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              /lp-positions/revenue/{"{owner}"}
            </code>
            .
          </>
        }
      >
        <article
          className={`relative overflow-hidden rounded-3xl border border-border bg-card p-6`}
        >
          <div
            aria-hidden
            className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-15 blur-3xl ${ACCENT_BG[theme]}`}
          />
          <div className="relative">
            <EquityCurve points={revenueToEquity(revenue)} />
          </div>
        </article>
      </SectionShell>

      <SectionShell
        eyebrow="trophy case"
        title="Positions — open and closed."
        body="Held + settled liquidity positions reported by LP Agent."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TrophyCase
            testId="trophy-case-open"
            title="Open positions"
            emptyHint="No open positions reported by LP Agent."
            positions={openPositions}
          />
          <TrophyCase
            testId="trophy-case-history"
            title="Closed positions"
            emptyHint="No closed positions reported by LP Agent."
            positions={history}
          />
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="post-season recap"
        title="What this season cost — or earned."
        body="The AI Coach reads your most recent settled position against the winner and tells you why."
      >
        <RecapHint pubkey={pubkey} history={history} />
      </SectionShell>

      <SectionShell
        eyebrow="activity"
        title="Position logs"
        body="Every add, remove, fee-claim and rebalance — straight from LP Agent's logs endpoint."
      >
        <PositionLogsFeed logs={logs} />
      </SectionShell>
    </main>
  );
}

function SectionShell({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: React.ReactNode;
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

function HeroKpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "win" | "loss" | "neutral";
}) {
  const toneClass =
    tone === "win"
      ? "text-arena-emerald"
      : tone === "loss"
        ? "text-destructive"
        : "text-white";
  return (
    <div className="flex flex-col gap-1.5 bg-[#070912] px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </span>
      <span
        className={`font-display text-2xl font-medium tabular-nums tracking-tight ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}
