"use client";

import { motion, useReducedMotion } from "motion/react";

const STEPS = [
  {
    n: "01",
    accent: "emerald",
    title: "Pick an arena",
    body: "Browse top Meteora pools by TVL. Each one is a live arena with its own pot tier and theme accent.",
  },
  {
    n: "02",
    accent: "orange",
    title: "Zap in",
    body: "Connect Phantom, choose a bin range — or let the AI Coach suggest one — and Zap-In with a single signature.",
  },
  {
    n: "03",
    accent: "violet",
    title: "Climb the ladder",
    body: "LP Agent re-scores every minute. Top three at the bell split 50/30/20 of the on-chain pot.",
  },
] as const;

const ACCENT_BG: Record<string, string> = {
  emerald: "bg-arena-emerald",
  orange: "bg-arena-orange",
  violet: "bg-arena-violet",
};
const ACCENT_TEXT: Record<string, string> = {
  emerald: "text-arena-emerald",
  orange: "text-arena-orange",
  violet: "text-arena-violet",
};

export function SectionHowItWorks() {
  const reduce = useReducedMotion();

  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          how it works
        </span>
        <h2 className="font-display text-balance text-4xl font-light tracking-[-0.01em] sm:text-5xl">
          From pool to{" "}
          <em className="italic text-arena-orange">podium</em> in three moves.
        </h2>
        <p className="max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
          A meteoric LP loop. Real positions on Meteora DAMM v2, scored by LP
          Agent, settled by an Anchor program on Solana devnet.
        </p>
      </header>

      <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.n}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl transition-opacity ${ACCENT_BG[s.accent]} opacity-10 group-hover:opacity-25`}
            />
            <div className="flex items-center justify-between">
              <span
                className={`font-mono text-xs tracking-[0.2em] ${ACCENT_TEXT[s.accent]}`}
              >
                {s.n}
              </span>
              <Snowflake className={`h-4 w-4 ${ACCENT_TEXT[s.accent]}`} />
            </div>
            <h3 className="font-display text-2xl font-medium tracking-tight">
              {s.title}
            </h3>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function Snowflake({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M12 2v20M2 12h20M4.5 4.5l15 15M19.5 4.5l-15 15" />
      <path d="M12 6l-2 2M12 6l2 2M12 18l-2-2M12 18l2-2" />
      <path d="M6 12l2-2M6 12l2 2M18 12l-2-2M18 12l-2 2" />
    </svg>
  );
}
