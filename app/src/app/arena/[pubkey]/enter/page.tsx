import Link from "next/link";
import { Connection, PublicKey } from "@solana/web3.js";
import { notFound } from "next/navigation";
import { EntryCoachHint } from "@/components/ai/entry-coach-hint";
import { EntryWizardClient } from "@/components/entry-wizard-client";
import { TokenIcon } from "@/components/token-icon";
import { fetchArena } from "@/lib/chain/program";
import { findPoolById, poolInfoTokens } from "@/lib/lpagent/client";
import type { LpAgentTokenData } from "@/lib/lpagent/types";
import { arenaThemeFor, fmtUsd } from "@/lib/format";

export const revalidate = 60;

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

export default async function EntryWizardPage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;

  let poolId = pubkey;
  let pool = await findPoolById(pubkey).catch(() => null);

  if (!pool) {
    try {
      const conn = new Connection(RPC, "confirmed");
      const arena = await fetchArena(conn, new PublicKey(pubkey));
      if (arena) {
        poolId = arena.pool.toBase58();
        pool = await findPoolById(poolId).catch(() => null);
      }
    } catch {
      // pubkey wasn't a valid PublicKey, or RPC failed — fall through to 404.
    }
  }

  if (!pool) notFound();

  const tokens = await poolInfoTokens(poolId).catch<LpAgentTokenData[]>(
    () => []
  );
  const theme = arenaThemeFor(pool.pool);
  const t0 = tokens.find((t) => t.id === pool.token0);
  const t1 = tokens.find((t) => t.id === pool.token1);
  const pair = `${pool.token0_symbol} · ${pool.token1_symbol}`;

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
          entry wizard · 3 steps
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
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${ACCENT_BG[theme]}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${ACCENT_BG[theme]}`} />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
              you&rsquo;re entering · {theme} arena
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex -space-x-3 rounded-full bg-white/5 p-1.5 ring-2 ring-inset ${ACCENT_RING[theme]}`}
            >
              <TokenIcon src={t0?.icon} symbol={pool.token0_symbol} size={48} />
              <TokenIcon src={t1?.icon} symbol={pool.token1_symbol} size={48} />
            </div>
            <h1 className="font-display text-balance text-4xl font-light leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              Enter{" "}
              <em className="italic text-white/80">{pair}</em>
            </h1>
          </div>
          <p className="max-w-lg text-balance text-sm text-white/65">
            Three signatures: confirm the pool, fund the on-chain pot, then
            Zap-In via LP Agent. Your LP performance is then re-scored every
            minute until the bell rings.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[11px]">
            <Pill label="Protocol" value={pool.protocol.replace("meteora_", "meteora ")} />
            <Pill label="TVL" value={fmtUsd(pool.tvl)} />
            <Pill label="Split" value="50 · 30 · 20" />
          </div>
        </div>
      </header>

      <EntryWizardClient
        pubkey={pubkey}
        pool={{
          pool: pool.pool,
          protocol: pool.protocol,
          tvl: pool.tvl,
          token0_symbol: pool.token0_symbol,
          token1_symbol: pool.token1_symbol,
          token0: pool.token0,
          token1: pool.token1,
        }}
        tokens={tokens}
        theme={theme}
      />

      <section className="flex flex-col gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          ai coach
        </span>
        <h2 className="font-display text-2xl font-medium tracking-tight">
          A bin range, suggested.
        </h2>
        <EntryCoachHint
          poolId={pool.pool}
          binStep={pool.bin_step}
          price1hChangePct={pool.price_1h_change}
          price6hChangePct={pool.price_6h_change}
          price24hChangePct={pool.price_24h_change}
          theme={theme}
        />
      </section>
    </main>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/80 backdrop-blur-sm">
      <span className="font-mono uppercase tracking-[0.2em] text-white/45">
        {label}
      </span>
      <span>{value}</span>
    </span>
  );
}
