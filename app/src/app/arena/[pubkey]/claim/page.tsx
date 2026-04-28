import Link from "next/link";
import { Connection, PublicKey } from "@solana/web3.js";
import { notFound } from "next/navigation";
import { ClaimClient } from "@/components/claim-client";
import { TokenIcon } from "@/components/token-icon";
import { LifecyclePill } from "@/components/lifecycle-pill";
import { fetchArena } from "@/lib/chain/program";
import { deriveArenaLifecycle } from "@/lib/chain/arenas";
import { findPoolById, poolInfoTokens } from "@/lib/lpagent/client";
import type { LpAgentTokenData } from "@/lib/lpagent/types";
import { arenaThemeFor } from "@/lib/format";

export const revalidate = 30;

const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

const ACCENT_BG: Record<string, string> = {
  emerald: "bg-arena-emerald",
  orange: "bg-arena-orange",
  sky: "bg-arena-sky",
  violet: "bg-arena-violet",
};

const ACCENT_RING: Record<string, string> = {
  emerald: "ring-arena-emerald/30",
  orange: "ring-arena-orange/30",
  sky: "ring-arena-sky/30",
  violet: "ring-arena-violet/30",
};

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

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;

  let arenaPk: PublicKey;
  try {
    arenaPk = new PublicKey(pubkey);
  } catch {
    notFound();
  }

  const conn = new Connection(RPC, "confirmed");
  const arena = await fetchArena(conn, arenaPk).catch(() => null);
  if (!arena) notFound();

  const pool = await findPoolById(arena.pool.toBase58()).catch(() => null);
  const tokens = await poolInfoTokens(arena.pool.toBase58()).catch<LpAgentTokenData[]>(
    () => []
  );

  const t0 = pool ? tokens.find((t) => t.id === pool.token0) : undefined;
  const t1 = pool ? tokens.find((t) => t.id === pool.token1) : undefined;
  const pair = pool
    ? `${pool.token0_symbol} · ${pool.token1_symbol}`
    : `${arena.pool.toBase58().slice(0, 4)}…${arena.pool.toBase58().slice(-4)}`;
  const theme = arenaThemeFor(arenaPk.toBase58()) as keyof typeof ACCENT_BG;

  const stateName = readArenaStateName(arena.state);
  const lifecycle = deriveArenaLifecycle(
    stateName,
    Number(arena.entryOpenTs),
    Number(arena.entryCloseTs),
    Math.floor(Date.now() / 1000)
  );

  const entryFeeSol = (Number(arena.entryFeeLamports) / 1e9).toFixed(3);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 pb-32 pt-10">
      <nav className="flex items-center justify-between text-sm">
        <Link
          href={`/arena/${pubkey}`}
          className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← back to arena
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          claim
        </span>
      </nav>

      <header
        className={`relative overflow-hidden rounded-[2rem] border border-border bg-[#070912] p-8 text-white shadow-xl`}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-32 -top-32 h-[24rem] w-[24rem] rounded-full opacity-30 blur-3xl ${ACCENT_BG[theme]}`}
        />
        <div
          aria-hidden
          className={`absolute inset-x-0 top-0 h-px ${ACCENT_BG[theme]} opacity-80`}
        />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <LifecyclePill lifecycle={lifecycle} />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
              arena #{Number(arena.index).toString().padStart(3, "0")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex -space-x-3 rounded-full bg-white/5 p-1.5 ring-2 ring-inset ${ACCENT_RING[theme]}`}
            >
              {pool && (
                <>
                  <TokenIcon
                    src={t0?.icon}
                    symbol={pool.token0_symbol}
                    size={48}
                  />
                  <TokenIcon
                    src={t1?.icon}
                    symbol={pool.token1_symbol}
                    size={48}
                  />
                </>
              )}
            </div>
            <h1 className="font-display text-balance text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              {lifecycle === "settled" ? "Claim your" : "Claim your"}{" "}
              <em className="italic text-white/80">share</em>
            </h1>
          </div>
          <p className="max-w-lg text-balance text-sm text-white/65">
            {lifecycle === "settled"
              ? `${pair} settled. If you placed top three, you can withdraw your prize-pot share. If you didn't place, the on-chain entry stays as a record.`
              : lifecycle === "cancelled"
                ? `${pair} was cancelled before settlement. Every entrant can reclaim their full ${entryFeeSol} SOL buy-in — no fee taken.`
                : `${pair} is still ${lifecycle === "live" ? "running" : "in entry window"}. The bell rings at ${new Date(Number(arena.endTs) * 1000).toUTCString()}, then payouts open.`}
          </p>
        </div>
      </header>

      <ClaimClient
        arenaPubkey={pubkey}
        arenaState={stateName}
        lifecycle={lifecycle}
        theme={theme}
        pair={pair}
        entryFeeSol={entryFeeSol}
        endTsMs={Number(arena.endTs) * 1000}
      />
    </main>
  );
}
