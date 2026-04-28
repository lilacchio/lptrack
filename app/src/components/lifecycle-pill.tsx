import {
  lifecycleAccent,
  lifecycleLabel,
  type ArenaLifecycle,
} from "@/lib/chain/arenas";

const ACCENT_RING: Record<string, string> = {
  emerald: "border-arena-emerald text-arena-emerald",
  orange: "border-arena-orange text-arena-orange",
  sky: "border-arena-sky text-arena-sky",
  violet: "border-arena-violet text-arena-violet",
  muted: "border-border text-muted-foreground",
};

const ACCENT_DOT: Record<string, string> = {
  emerald: "bg-arena-emerald",
  orange: "bg-arena-orange",
  sky: "bg-arena-sky",
  violet: "bg-arena-violet",
  muted: "bg-muted-foreground/50",
};

export function LifecyclePill({
  lifecycle,
  className,
  pulse,
}: {
  lifecycle: ArenaLifecycle;
  className?: string;
  pulse?: boolean;
}) {
  const accent = lifecycleAccent(lifecycle);
  const animatePulse =
    pulse ?? (lifecycle === "live" || lifecycle === "entry_open");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-background/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] backdrop-blur-sm ${ACCENT_RING[accent]} ${className ?? ""}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {animatePulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${ACCENT_DOT[accent]}`}
          />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${ACCENT_DOT[accent]}`}
        />
      </span>
      {lifecycleLabel(lifecycle)}
    </span>
  );
}
