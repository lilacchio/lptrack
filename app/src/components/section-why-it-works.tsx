"use client";

import { motion, useReducedMotion } from "motion/react";

export function SectionWhyItWorks() {
  return (
    <section className="flex flex-col gap-24">
      <FeatureRow
        eyebrow="real positions"
        title={
          <>
            Real LP positions.
            <br />
            <em className="italic text-arena-emerald">Real</em> PnL.
          </>
        }
        body="No synthetic markets, no paper trades. You hold an actual Meteora DAMM v2 position the entire arena. Win or lose, your fees and impermanent loss are yours."
        align="left"
        accent="emerald"
      >
        <ArenaCardMock />
      </FeatureRow>

      <FeatureRow
        eyebrow="scored every minute"
        title={
          <>
            Live oracle, served{" "}
            <em className="italic text-arena-sky">cold</em>.
          </>
        }
        body="LP Agent scores the entire field every 60 seconds — fees, impermanent loss, holding time, everything. The leaderboard you see is the leaderboard the contract settles on."
        align="right"
        accent="sky"
      >
        <LeaderboardMock />
      </FeatureRow>

      <FeatureRow
        eyebrow="settled on-chain"
        title={
          <>
            Signed by the oracle.
            <br />
            Settled by the{" "}
            <em className="italic text-arena-violet">chain</em>.
          </>
        }
        body="Final standings are Ed25519-signed and settled by an Anchor program on Solana devnet. No admin override, no off-chain custodian. The pot is split the second the oracle posts."
        align="left"
        accent="violet"
      >
        <SettlementMock />
      </FeatureRow>
    </section>
  );
}

const ACCENT_BG: Record<string, string> = {
  emerald: "bg-arena-emerald",
  orange: "bg-arena-orange",
  sky: "bg-arena-sky",
  violet: "bg-arena-violet",
};
const ACCENT_TEXT: Record<string, string> = {
  emerald: "text-arena-emerald",
  sky: "text-arena-sky",
  violet: "text-arena-violet",
  orange: "text-arena-orange",
};

function FeatureRow({
  eyebrow,
  title,
  body,
  align,
  accent,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  align: "left" | "right";
  accent: keyof typeof ACCENT_BG;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const isLeft = align === "left";

  return (
    <div
      className={`grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] ${
        isLeft ? "" : "lg:[&>div:first-child]:order-2"
      }`}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, x: isLeft ? -40 : 40 }}
        whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-5"
      >
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.22em] ${ACCENT_TEXT[accent]}`}
        >
          {eyebrow}
        </span>
        <h3 className="font-display text-balance text-4xl font-light leading-[1.05] tracking-[-0.01em] sm:text-5xl">
          {title}
        </h3>
        <p className="max-w-md text-balance text-base text-muted-foreground">
          {body}
        </p>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center justify-center"
      >
        <DottedArcs accent={accent} />
        <div className="relative">{children}</div>
      </motion.div>
    </div>
  );
}

function DottedArcs({ accent }: { accent: keyof typeof ACCENT_BG }) {
  const color =
    accent === "emerald"
      ? "var(--arena-emerald)"
      : accent === "sky"
        ? "var(--arena-sky)"
        : accent === "violet"
          ? "var(--arena-violet)"
          : "var(--arena-orange)";
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 -m-12 h-[calc(100%+6rem)] w-[calc(100%+6rem)]"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id={`dot-${accent}`} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill={color} opacity="0.45" />
        </pattern>
      </defs>
      <circle cx="200" cy="200" r="180" fill="none" stroke={`url(#dot-${accent})`} strokeWidth="6" strokeDasharray="2 4" opacity="0.6" />
      <circle cx="200" cy="200" r="140" fill="none" stroke={`url(#dot-${accent})`} strokeWidth="4" strokeDasharray="2 6" opacity="0.4" />
      <circle cx="60" cy="200" r="3" fill={color} />
      <circle cx="340" cy="220" r="2" fill={color} opacity="0.6" />
    </svg>
  );
}

/* ---------- Mock cards (themed, hand-built, no AI imagery) ---------- */

function ArenaCardMock() {
  return (
    <div className="relative flex w-[300px] flex-col gap-5 rounded-3xl border border-border bg-card p-5 shadow-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-arena-emerald opacity-20 blur-3xl"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-arena-emerald" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            emerald
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          meteora damm v2
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="font-display text-2xl font-medium tracking-tight">
          SOL · USDC
        </h4>
        <span className="font-mono text-xs tabular-nums text-arena-emerald">
          +2.4% <span className="text-muted-foreground">· 24h</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            tvl
          </span>
          <span className="text-base font-medium tabular-nums">$8.2M</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            24h vol
          </span>
          <span className="text-base font-medium tabular-nums">$1.4M</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono uppercase tracking-[0.18em] text-muted-foreground">
          view arena
        </span>
        <span className="font-mono text-arena-emerald">→</span>
      </div>
    </div>
  );
}

function LeaderboardMock() {
  const ROWS = [
    { rank: 1, addr: "F1na…q2Lp", pnl: "+18.4%", bar: "w-full", accent: "bg-arena-emerald" },
    { rank: 2, addr: "8kCx…Mn3v", pnl: "+12.1%", bar: "w-[78%]", accent: "bg-arena-sky" },
    { rank: 3, addr: "Qz7w…rT9u", pnl: "+9.7%", bar: "w-[62%]", accent: "bg-arena-violet" },
    { rank: 4, addr: "2eXV…SVUf", pnl: "+4.2%", bar: "w-[38%]", accent: "bg-muted-foreground/40" },
  ];
  return (
    <div className="flex w-[340px] flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="font-display text-base font-medium tracking-tight">
          Leaderboard
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-arena-sky opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-arena-sky" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-arena-sky">
            tick 47
          </span>
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {ROWS.map((r) => (
          <li
            key={r.rank}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
          >
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {String(r.rank).padStart(2, "0")}
            </span>
            <span className="font-mono text-xs tabular-nums">{r.addr}</span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`absolute inset-y-0 left-0 ${r.bar} ${r.accent} rounded-full`}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-arena-emerald">
              {r.pnl}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettlementMock() {
  return (
    <div className="relative flex w-[320px] flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="font-display text-base font-medium tracking-tight">
          settle_arena
        </span>
        <span className="rounded-full border border-arena-violet px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-arena-violet">
          confirmed
        </span>
      </div>
      <Row label="program" value="Hrto…GEc4" />
      <Row label="oracle" value="E38y…cRj4" />
      <Row label="tx" value="22WHsn6z…p42Pz" />
      <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
        <Pay rank={1} pct="50%" sol="0.049" />
        <Pay rank={2} pct="30%" sol="0.0294" />
        <Pay rank={3} pct="20%" sol="0.0196" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between font-mono text-xs">
      <span className="uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Pay({ rank, pct, sol }: { rank: number; pct: string; sol: string }) {
  const accent = rank === 1 ? "text-arena-emerald" : rank === 2 ? "text-arena-sky" : "text-arena-violet";
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-background/40 py-2">
      <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${accent}`}>
        rank {rank}
      </span>
      <span className="text-sm font-medium tabular-nums">{pct}</span>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
        {sol} SOL
      </span>
    </div>
  );
}
