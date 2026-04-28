import Link from "next/link";

export const metadata = {
  title: "FAQ — LP Arena",
  description: "Frequently asked questions about LP Arena.",
};

const FAQS = [
  {
    q: "Is this real money?",
    a: "On devnet, no — entry fees are paid in devnet SOL which has no market value. The flow is identical to what mainnet would look like, but nothing real is at risk.",
  },
  {
    q: "Do I need a wallet to browse?",
    a: "No. Browsing arenas, leaderboards, and profiles is open. You only need a wallet to enter an arena, sign settlement, or claim a payout.",
  },
  {
    q: "Which wallets are supported?",
    a: "Phantom and Solflare via Solana wallet-adapter. Privy email login is on the roadmap but deferred for the bounty.",
  },
  {
    q: "How is my LP score calculated?",
    a: "Your score is dpr_native — realized + unrealized PnL denominated in the pool's native quote token, summed across your open positions in the arena pool. LP Agent re-computes this every 60 seconds.",
  },
  {
    q: "Can I exit early?",
    a: "Not voluntarily. The fixed-duration commitment is the entire point of the format. You can always close your underlying Meteora position, but your buy-in stays in the pot until settlement.",
  },
  {
    q: "What if the pool gets rugged mid-arena?",
    a: "A 30-second safety watcher monitors LP Agent's organic score and top-holder concentration. If a configured gate trips, the watcher calls cancel_arena and every entrant claims a full refund.",
  },
  {
    q: "Who runs the scoring oracle?",
    a: "Right now, the project maker. The Ed25519 oracle key is separate from the admin key and is rotatable via update_config. Decentralizing the oracle is on the post-bounty roadmap.",
  },
  {
    q: "How are payouts split?",
    a: "Top three: 50% / 30% / 20%. Before the split, the program takes a 2% protocol fee on the pot.",
  },
  {
    q: "Is the program audited?",
    a: "No. Treat devnet as a testnet for the program logic. We'll commission an audit before any mainnet deploy.",
  },
  {
    q: "Why Meteora?",
    a: "DAMM v2 has the cleanest concentrated-liquidity primitive on Solana, an excellent SDK, and rich on-chain data via LP Agent. Most importantly, it has actual LPs whose performance is interesting to watch.",
  },
  {
    q: "Can I create my own arena?",
    a: "Not yet. Creator arenas (top-50 LPers spinning up their own challenges) are scoped for the next phase, after the sidetrack bounty.",
  },
  {
    q: "Where can I see the program code?",
    a: (
      <>
        Everything is on{" "}
        <a
          className="text-arena-emerald underline-offset-4 hover:underline"
          href="https://github.com/lilacchio/lptrack"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        . The Anchor program lives in <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">programs/lp-arena/</code> and the deployed instance is verifiable on Solana Explorer.
      </>
    ),
  },
] as const;

export default function FaqPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 pb-32 pt-12">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          faq
        </span>
        <h1 className="font-display text-balance text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">
          Quick{" "}
          <em className="italic text-arena-violet">questions</em>.
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          The short version. For the full field manual, see{" "}
          <Link
            href="/help"
            className="text-foreground underline-offset-4 hover:underline"
          >
            How LP Arena works
          </Link>
          .
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {FAQS.map((f, i) => (
          <li key={f.q}>
            <details className="group rounded-3xl border border-border bg-card transition-all open:shadow-sm">
              <summary className="flex cursor-pointer items-start justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-lg font-medium tracking-tight">
                    {f.q}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45"
                >
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M8 2v12M2 8h12" />
                  </svg>
                </span>
              </summary>
              <div className="px-6 pb-6 text-base text-muted-foreground">
                {f.a}
              </div>
            </details>
          </li>
        ))}
      </ol>

      <footer className="rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          missing one?
        </p>
        <p className="mt-2 text-base text-muted-foreground">
          Open an issue on{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href="https://github.com/lilacchio/lptrack/issues"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>{" "}
          and we&rsquo;ll fold it in.
        </p>
      </footer>
    </main>
  );
}
