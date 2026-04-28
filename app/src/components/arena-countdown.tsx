"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

function diff(now: number, end: number) {
  let s = Math.max(0, Math.floor((end - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return { d, h, m, s };
}

export function ArenaCountdown({ endTsMs }: { endTsMs: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = diff(now ?? endTsMs, endTsMs);
  const expired = (now ?? 0) >= endTsMs;

  return (
    <div
      data-testid="arena-countdown"
      className="flex items-baseline gap-3 font-mono"
    >
      {expired ? (
        <span className="text-sm text-muted-foreground uppercase tracking-[0.18em]">
          arena ended
        </span>
      ) : (
        <>
          <Cell value={t.d} label="d" />
          <Sep />
          <Cell value={t.h} label="h" />
          <Sep />
          <Cell value={t.m} label="m" />
          <Sep />
          <Cell value={t.s} label="s" pulse />
        </>
      )}
    </div>
  );
}

function Cell({
  value,
  label,
  pulse,
}: {
  value: number;
  label: string;
  pulse?: boolean;
}) {
  const display = value.toString().padStart(2, "0");
  return (
    <div className="flex items-baseline gap-1">
      <motion.span
        key={display}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className={`text-2xl font-medium tabular-nums ${
          pulse ? "text-arena-emerald" : "text-current"
        }`}
      >
        {display}
      </motion.span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-current opacity-60">
        {label}
      </span>
    </div>
  );
}

function Sep() {
  return <span className="text-xl text-current opacity-40">·</span>;
}
