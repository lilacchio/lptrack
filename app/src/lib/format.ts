const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n < 0.01) return "<$0.01";
  return `$${COMPACT.format(n)}`;
}

export function fmtPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

const ARENA_THEMES = ["emerald", "orange", "sky", "violet"] as const;
export type ArenaTheme = (typeof ARENA_THEMES)[number];

export function arenaThemeFor(seed: string): ArenaTheme {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ARENA_THEMES[Math.abs(h) % ARENA_THEMES.length];
}
