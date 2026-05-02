"use client";

import { motion } from "motion/react";

type Slide = {
  Component: () => React.ReactNode;
};

const TONE_TEXT = {
  emerald: "text-arena-emerald",
  sky: "text-arena-sky",
  orange: "text-arena-orange",
  violet: "text-arena-violet",
} as const;

export const SLIDES: Slide[] = [
  { Component: SlideTitle },
  { Component: SlideProblem },
  { Component: SlideInsight },
  { Component: SlideProduct },
  { Component: SlideArchitecture },
  { Component: SlideEndpointMatrix },
  { Component: SlideProofs },
  { Component: SlideAudience },
  { Component: SlideClose },
];

function SlideShell({
  eyebrow,
  children,
  align = "left",
}: {
  eyebrow?: string;
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col justify-center gap-10 px-8 py-16 sm:px-16">
      {eyebrow && (
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground ${
            align === "center" ? "text-center" : ""
          }`}
        >
          {eyebrow}
        </motion.span>
      )}
      <div className={align === "center" ? "text-center" : ""}>{children}</div>
    </div>
  );
}

function SlideTitle() {
  return (
    <SlideShell align="center">
      <div className="flex flex-col items-center gap-10">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-arena-emerald" />
          <span>lp-arena</span>
          <span className="text-border">·</span>
          <span>lp agent sidetrack</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="font-display text-balance text-7xl font-light leading-[0.98] tracking-[-0.03em] sm:text-[120px]"
        >
          LPing is a{" "}
          <em className="italic text-arena-emerald">sport</em>
          <br />
          now.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
        >
          Meteora LP performance, scored live by LP Agent, on a Solana
          prize-pot Anchor program.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="flex items-center gap-6 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span>lp-arena.vercel.app</span>
          <span className="text-border">·</span>
          <span>16 / 16 endpoints</span>
          <span className="text-border">·</span>
          <span>devnet live</span>
        </motion.div>
      </div>
    </SlideShell>
  );
}

function SlideProblem() {
  return (
    <SlideShell eyebrow="the problem">
      <h2 className="font-display text-balance text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-7xl">
        Trading has tournaments.
        <br />
        <em className="italic text-muted-foreground">LPing doesn&rsquo;t.</em>
      </h2>
      <ul className="mt-12 grid grid-cols-1 gap-6 text-base text-muted-foreground sm:grid-cols-3 sm:text-lg">
        {[
          "Yields are private. You can't compare to anyone.",
          "Leaderboards don't exist for liquidity providers.",
          "Bragging rights die in a Discord screenshot.",
        ].map((line, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
            className="border-l border-border/80 pl-4"
          >
            {line}
          </motion.li>
        ))}
      </ul>
    </SlideShell>
  );
}

function SlideInsight() {
  return (
    <SlideShell eyebrow="the insight">
      <h2 className="font-display text-balance text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-7xl">
        LP Agent already publishes the only data point that makes LPing{" "}
        <em className="italic text-arena-emerald">rank-able</em>.
      </h2>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { k: "pnlNative", v: "Realized PnL, denominated in SOL" },
          { k: "dprNative", v: "Daily SOL return — the scoring axis" },
          { k: "revenue", v: "Fees collected, by owner, in SOL" },
        ].map((item, i) => (
          <motion.div
            key={item.k}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
            className="rounded-2xl border border-border/60 bg-card/50 p-6"
          >
            <div className="font-mono text-sm text-arena-emerald">
              {item.k}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{item.v}</div>
          </motion.div>
        ))}
      </div>
      <p className="mt-12 max-w-3xl text-balance text-lg text-muted-foreground">
        Once LPs can be scored on the same axis, you can run a tournament.
        Tournaments need an escrow that pays winners and refuses to pay
        anyone else. That&rsquo;s a 9-instruction Anchor program.
      </p>
    </SlideShell>
  );
}

function SlideProduct() {
  return (
    <SlideShell eyebrow="the product">
      <h2 className="font-display text-balance text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-7xl">
        Bounded seasons. On-chain pot.{" "}
        <em className="italic text-arena-emerald">Live scoring.</em>
      </h2>
      <ol className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-4">
        {[
          {
            n: "01",
            t: "Spawn",
            d: "A fresh arena auto-spawns daily on a real Meteora pool.",
          },
          {
            n: "02",
            t: "Enter",
            d: "Players Zap-In through LP Agent — SOL into escrow, position into the pool.",
          },
          {
            n: "03",
            t: "Score",
            d: "Scoring oracle re-ranks every 60s using LP Agent dprNative.",
          },
          {
            n: "04",
            t: "Settle",
            d: "Ed25519-signed payload settles on-chain. Top three split 50 / 30 / 20.",
          },
        ].map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
            className="rounded-2xl border border-border/60 bg-card/50 p-6"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {s.n}
            </div>
            <div className="mt-3 font-display text-2xl font-light tracking-tight">
              {s.t}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{s.d}</div>
          </motion.li>
        ))}
      </ol>
    </SlideShell>
  );
}

function SlideArchitecture() {
  const blocks: {
    tag: string;
    head: string;
    body: string;
    tone: "sky" | "emerald" | "orange" | "violet";
  }[] = [
    {
      tag: "edge",
      head: "Next.js 16 · Vercel",
      body: "Tailwind 4 · shadcn · Fraunces · motion. ISR on every read endpoint.",
      tone: "sky",
    },
    {
      tag: "chain",
      head: "lp_arena · devnet",
      body: "9-instruction Anchor program. Ed25519 sigverify. Top-3 prize split.",
      tone: "emerald",
    },
    {
      tag: "oracle",
      head: "Scoring service",
      body: "5 crons on a VPS — spawn · leaderboard · safety · settle · elo.",
      tone: "orange",
    },
    {
      tag: "api",
      head: "LP Agent Premium",
      body: "16 / 16 endpoints wired. Server-only proxy. 60s revalidate.",
      tone: "violet",
    },
  ];
  return (
    <SlideShell eyebrow="architecture">
      <h2 className="font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl">
        Edge, chain, oracle, and a single Premium API.
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {blocks.map((b, i) => (
          <motion.div
            key={b.tag}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.1 }}
            className="rounded-2xl border border-border/60 bg-card/50 p-6"
          >
            <div
              className={`font-mono text-[10px] uppercase tracking-[0.22em] ${TONE_TEXT[b.tone]}`}
            >
              {b.tag}
            </div>
            <div className="mt-3 font-display text-xl font-light tracking-tight">
              {b.head}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{b.body}</div>
          </motion.div>
        ))}
      </div>
      <p className="mt-10 max-w-3xl text-base text-muted-foreground">
        Wallet → Next.js. Next.js → Anchor program for writes, Supabase for
        reads, LP Agent through a server-only proxy. The scoring service is
        the only thing that signs settlement payloads — the program rejects
        anyone else.
      </p>
    </SlideShell>
  );
}

function SlideEndpointMatrix() {
  const ROWS = [
    ["GET", "/pools/discover", "Home arena grid"],
    ["GET", "/pools/{id}/info", "Token icons + safety badges"],
    ["GET", "/pools/{id}/onchain-stats", "On-chain pulse card"],
    ["GET", "/pools/{id}/top-lpers", "Live leaderboard"],
    ["GET", "/pools/{id}/positions", "Tracked positions"],
    ["GET", "/lp-positions/overview", "Profile KPIs"],
    ["GET", "/lp-positions/opening", "Open positions"],
    ["GET", "/lp-positions/historical", "Closed history"],
    ["GET", "/lp-positions/revenue/{owner}", "Equity curve, 30d"],
    ["GET", "/lp-positions/logs", "Position log feed"],
    ["GET", "/token/balance", "Pre-flight SOL check"],
    ["POST", "/pools/{id}/add-tx", "Zap-In · build tx"],
    ["POST", "/pools/landing-add-tx", "Zap-In · Jito landing"],
    ["POST", "/position/decrease-quotes", "Zap-Out · quote"],
    ["POST", "/position/decrease-tx", "Zap-Out · build tx"],
    ["POST", "/position/landing-decrease-tx", "Zap-Out · Jito landing"],
  ];
  return (
    <SlideShell eyebrow="lp agent endpoint matrix">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="font-display text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-7xl">
          16 / 16{" "}
          <em className="italic text-muted-foreground">live, every one
          on-screen.</em>
        </h2>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-1 font-mono text-xs sm:grid-cols-2">
        {ROWS.map(([method, path, where], i) => (
          <motion.div
            key={path}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18 + i * 0.025 }}
            className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-border/40 py-2"
          >
            <span
              className={`font-semibold ${
                method === "GET" ? "text-arena-sky" : "text-arena-orange"
              }`}
            >
              {method}
            </span>
            <span className="truncate text-foreground">{path}</span>
            <span className="truncate text-right text-muted-foreground">
              {where}
            </span>
          </motion.div>
        ))}
      </div>
      <p className="mt-8 max-w-3xl text-base text-muted-foreground">
        No &ldquo;called from code, never reaches a screen&rdquo; cheating.
        Every read drives a visible component, every Zap route is wired into
        the Entry Wizard or the post-claim exit flow.
      </p>
    </SlideShell>
  );
}

function SlideProofs() {
  return (
    <SlideShell eyebrow="devnet proofs">
      <h2 className="font-display text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">
        Real program. Real arena. Real claims.
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ProofCard
          label="Program"
          value="Hrto23us…GEc4"
          sub="9 instructions · Ed25519 sigverify · 200 bps protocol fee"
          accent="emerald"
        />
        <ProofCard
          label="Live judging arena"
          value="5h3UD5KM…PaRsJ"
          sub="SOL · USDC · 0.025 SOL entry · 50/30/20 split · 24h+24h window"
          accent="sky"
        />
        <ProofCard
          label="settle_arena tx"
          value="22WHsn6z…p42Pz"
          sub="Ed25519Program::sigverify + lp_arena::settle_arena, one bundle"
          accent="orange"
        />
        <ProofCard
          label="claim_payout × 3"
          value="0.049 / 0.0294 / 0.0196 SOL"
          sub="Top-3 paid; rank-4 rejected on-chain with NotInPrizePositions"
          accent="violet"
        />
      </div>
      <p className="mt-8 max-w-3xl text-base text-muted-foreground">
        <span className="font-mono text-foreground">scripts/full-flow.ts</span>{" "}
        reproduces the entire path on devnet — create, four wallets enter,
        wait for end, settle, top-3 claim, rank-4 rejected.
      </p>
    </SlideShell>
  );
}

function ProofCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "emerald" | "sky" | "orange" | "violet";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.22em] ${TONE_TEXT[accent]}`}
      >
        {label}
      </div>
      <div className="mt-3 font-mono text-xl text-foreground">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}

function SlideAudience() {
  return (
    <SlideShell eyebrow="who it's for">
      <h2 className="font-display text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">
        Three audiences,{" "}
        <em className="italic text-arena-emerald">one product surface.</em>
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          {
            who: "Active Meteora LPs",
            why: "A public scoreboard for what they already do — verifiable PnL, prize SOL, no spreadsheet required.",
          },
          {
            who: "DeFi-native traders",
            why: "Tournament structure they already understand, applied to a yield surface they previously ignored.",
          },
          {
            who: "LP Agent ecosystem",
            why: "A live demo of every endpoint the Premium API ships, plus an OG share card stamped with the LP Agent badge on every win.",
          },
        ].map((a, i) => (
          <motion.div
            key={a.who}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.12 }}
            className="rounded-2xl border border-border/60 bg-card/50 p-6"
          >
            <div className="font-display text-2xl font-light tracking-tight">
              {a.who}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{a.why}</div>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
}

function SlideClose() {
  return (
    <SlideShell align="center">
      <div className="flex flex-col items-center gap-10">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
        >
          live now · devnet · no login required
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="font-display text-7xl font-light leading-[0.98] tracking-[-0.03em] sm:text-[110px]"
        >
          Click the link.
          <br />
          <em className="italic text-arena-emerald">Watch it score.</em>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-2 font-mono text-sm uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span className="text-foreground">lp-arena.vercel.app</span>
          <span>github.com/lilacchio/lptrack</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-arena-emerald" />
          <span>powered by lp agent · meteora · solana</span>
        </motion.div>
      </div>
    </SlideShell>
  );
}
