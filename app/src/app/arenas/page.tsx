import type { Metadata } from "next";
import Link from "next/link";
import { Connection } from "@solana/web3.js";
import { LiveArenaCard } from "@/components/live-arena-card";
import {
  type ArenaLifecycle,
  type ArenaSummary,
  listArenas,
} from "@/lib/chain/arenas";

export const metadata: Metadata = {
  title: "Archive — LP Arena",
  description:
    "Every LP Arena tournament past and present, on-chain and Solscan-verifiable.",
};

export const revalidate = 60;

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

const GROUPS: Array<{
  id: string;
  title: string;
  body: string;
  match: ArenaLifecycle[];
  emptyHint: string;
}> = [
  {
    id: "open",
    title: "Entry open",
    body: "Currently accepting new wallets. Click in to enter.",
    match: ["entry_open"],
    emptyHint:
      "Nothing accepting entries right now. The spawn cron rolls a fresh arena every 24h once Phase B lands.",
  },
  {
    id: "live",
    title: "Live · trading",
    body: "Entry window closed, oracle scoring every 60 seconds. Bell at end_ts.",
    match: ["live", "settling"],
    emptyHint: "No arenas mid-trade.",
  },
  {
    id: "settled",
    title: "Settled",
    body: "Bell rang. Top three already paid out on-chain. Click for the settlement tx.",
    match: ["settled"],
    emptyHint: "No settled arenas yet — first one is in flight.",
  },
  {
    id: "cancelled",
    title: "Cancelled · refunds",
    body: "Safety gate tripped or minimum entrants not met. Refunds claimable.",
    match: ["cancelled"],
    emptyHint: "Nothing has been cancelled. Good.",
  },
];

export default async function ArenasArchivePage() {
  const arenas = await safeListArenas();

  const groups = GROUPS.map((g) => ({
    ...g,
    items: arenas.filter((a) => g.match.includes(a.lifecycle)),
  }));

  const totals = {
    total: arenas.length,
    settled: arenas.filter((a) => a.lifecycle === "settled").length,
    live:
      arenas.filter(
        (a) => a.lifecycle === "live" || a.lifecycle === "entry_open"
      ).length,
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-32 pt-12">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          archive
        </span>
        <h1 className="font-display text-balance text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">
          Every arena,{" "}
          <em className="italic text-arena-violet">on-chain</em>.
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          Pulled directly from the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            lp_arena
          </code>{" "}
          program. Click any card to see the leaderboard, settlement transaction,
          and prize-pot split.
        </p>
        <ArchiveStats {...totals} />
      </header>

      {arenas.length === 0 ? (
        <EmptyState />
      ) : (
        groups.map((g) => (
          <Group
            key={g.id}
            id={g.id}
            title={g.title}
            body={g.body}
            items={g.items}
            emptyHint={g.emptyHint}
          />
        ))
      )}
    </main>
  );
}

function ArchiveStats({
  total,
  settled,
  live,
}: {
  total: number;
  settled: number;
  live: number;
}) {
  return (
    <div
      data-testid="archive-stats"
      className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border"
    >
      <ArchiveStat label="Total arenas" value={total.toString().padStart(2, "0")} />
      <ArchiveStat label="Currently running" value={live.toString().padStart(2, "0")} />
      <ArchiveStat label="Settled" value={settled.toString().padStart(2, "0")} />
    </div>
  );
}

function ArchiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-2xl font-medium tabular-nums tracking-tight">
        {value}
      </span>
    </div>
  );
}

function Group({
  id,
  title,
  body,
  items,
  emptyHint,
}: {
  id: string;
  title: string;
  body: string;
  items: ArenaSummary[];
  emptyHint: string;
}) {
  return (
    <section
      id={id}
      data-testid={`archive-group-${id}`}
      className="flex scroll-mt-20 flex-col gap-5"
    >
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {id}
        </span>
        <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
          {title}{" "}
          <span className="font-mono text-base text-muted-foreground tabular-nums">
            · {items.length}
          </span>
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{body}</p>
      </header>
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <LiveArenaCard key={a.pubkey} arena={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/40 p-16 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        no arenas yet
      </span>
      <h2 className="font-display text-3xl font-medium tracking-tight">
        The first arena hasn&rsquo;t spawned.
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Once the spawn cron is live on Railway, a new arena rolls every 24
        hours. Until then, the archive is empty by design.
      </p>
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-[0.22em] text-foreground underline-offset-4 hover:underline"
      >
        ← back to landing
      </Link>
    </section>
  );
}

async function safeListArenas() {
  try {
    const conn = new Connection(RPC, "confirmed");
    return await listArenas(conn);
  } catch (err) {
    console.error("[archive] listArenas failed:", err);
    return [];
  }
}
