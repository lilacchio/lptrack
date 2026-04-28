import Link from "next/link";

export const metadata = {
  title: "How LP Arena works — Help",
  description:
    "Rules, scoring, settlement, fees, safety gates, and refunds for LP Arena.",
};

const SECTIONS = [
  { id: "what", label: "What is an arena?" },
  { id: "enter", label: "Entering" },
  { id: "scoring", label: "Scoring" },
  { id: "settlement", label: "Settlement" },
  { id: "fees", label: "Fees" },
  { id: "safety", label: "Safety gates" },
  { id: "cancel", label: "Refunds & cancellation" },
  { id: "wallets", label: "Wallets & networks" },
] as const;

export default function HelpPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-32 pt-12">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          help · rules
        </span>
        <h1 className="font-display text-balance text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">
          How LP Arena{" "}
          <em className="italic text-arena-sky">works</em>.
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          A short field manual. Read this once and you&rsquo;ll know exactly
          what an arena is, how scoring lands you in the top three, and what
          happens to your SOL when the bell rings.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              contents
            </span>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="flex flex-col gap-12">
          <Block id="what" eyebrow="01" title="What is an arena?">
            <p>
              An arena is a fixed-duration competition on a single Meteora
              pool. Anyone can enter by paying a small SOL buy-in. While the
              arena is live, LP Agent re-scores every entrant&rsquo;s position
              every 60 seconds. When the arena ends, the top three split the
              on-chain pot 50 / 30 / 20.
            </p>
            <p>
              Every arena has a theme accent (emerald, orange, sky, violet),
              a pot tier (typically 0.025 SOL), and a duration (24 hours by
              default). The home page lists every active arena ranked by TVL.
            </p>
          </Block>

          <Block id="enter" eyebrow="02" title="Entering">
            <ol className="list-inside list-decimal space-y-2">
              <li>
                Pick an arena from the home grid or the featured banner.
              </li>
              <li>
                Connect Phantom or Solflare on devnet. The Connect button
                lives in the top right.
              </li>
              <li>
                Click <em>Enter the arena</em>. Sign the{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  enter_arena
                </code>{" "}
                instruction — your buy-in is locked into the on-chain prize
                vault.
              </li>
              <li>
                Open a real Meteora position via Zap-In. The AI Coach can
                suggest a bin range based on recent volatility.
              </li>
            </ol>
          </Block>

          <Block id="scoring" eyebrow="03" title="Scoring">
            <p>
              Your score is your{" "}
              <strong className="text-foreground">dpr_native</strong> —
              realized + unrealized PnL denominated in the pool&rsquo;s native
              quote token, summed across all your open positions in the arena
              pool. The scoring oracle pulls this from LP Agent&rsquo;s{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                /lp-positions/{`{owner}`}
              </code>{" "}
              endpoint every 60 seconds.
            </p>
            <p>
              The leaderboard you see on the arena page is the leaderboard
              the contract will settle on. There is no off-chain re-ranking
              or admin override.
            </p>
          </Block>

          <Block id="settlement" eyebrow="04" title="Settlement">
            <p>
              When the arena&rsquo;s{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                end_ts
              </code>{" "}
              passes, the scoring service builds a final-standings payload,
              signs it with the Ed25519 oracle key, and submits a single
              transaction containing two instructions:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                Ed25519Program::sigverify
              </code>{" "}
              followed by{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                lp_arena::settle_arena
              </code>
              . Once landed, ranks 1–3 can claim their share with a single{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                claim_payout
              </code>{" "}
              call.
            </p>
          </Block>

          <Block id="fees" eyebrow="05" title="Fees">
            <p>
              The Anchor program takes a 2% protocol fee on the pot before
              the 50 / 30 / 20 split. So if four entrants pay 0.025 SOL
              each (pot = 0.1 SOL), the distributable pot is 0.098 SOL — and
              ranks 1, 2, 3 receive 0.049, 0.0294, and 0.0196 SOL
              respectively. LP Agent and Meteora take their normal fees on
              the underlying liquidity position; LP Arena does not touch them.
            </p>
          </Block>

          <Block id="safety" eyebrow="06" title="Safety gates">
            <p>
              The 30-second safety watcher checks LP Agent&rsquo;s organic
              score, top-holder concentration, and mint-freeze flag against
              the arena&rsquo;s{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                SafetyGate
              </code>
              . If a pool degrades mid-arena (e.g. the dev rugs the pool, or
              top-holder concentration spikes), the watcher calls{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                cancel_arena
              </code>{" "}
              and every entrant gets a full refund.
            </p>
          </Block>

          <Block id="cancel" eyebrow="07" title="Refunds & cancellation">
            <p>
              You can&rsquo;t voluntarily exit an arena before it settles —
              that&rsquo;s the point. But if a safety gate trips, or the
              arena fails to reach a minimum entrant count, the program
              switches to <em>cancelled</em> state and every entrant calls{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                claim_refund
              </code>{" "}
              to recover their full buy-in. No fee is taken on cancellation.
            </p>
          </Block>

          <Block id="wallets" eyebrow="08" title="Wallets & networks">
            <p>
              We&rsquo;re on Solana <strong>devnet</strong> for the bounty.
              Phantom and Solflare are wired via wallet-adapter; Privy email
              login is deferred. You can grab devnet SOL from{" "}
              <a
                className="text-arena-emerald hover:underline"
                href="https://faucet.solana.com"
                target="_blank"
                rel="noreferrer"
              >
                faucet.solana.com ↗
              </a>
              . Mainnet ships in a later phase, after one full settled season
              on devnet.
            </p>
          </Block>
        </article>
      </div>

      <footer className="rounded-3xl border border-border bg-card p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          still stuck?
        </p>
        <p className="mt-2 text-base">
          Read the{" "}
          <Link
            href="/faq"
            className="text-arena-sky underline-offset-4 hover:underline"
          >
            FAQ
          </Link>
          , or DM the maker on Twitter. Bug reports go on{" "}
          <a
            className="text-arena-sky underline-offset-4 hover:underline"
            href="https://github.com/lilacchio/lptrack/issues"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </footer>
    </main>
  );
}

function Block({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex scroll-mt-24 flex-col gap-3 border-b border-border/60 pb-12 last:border-b-0 last:pb-0"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {eyebrow}
      </span>
      <h2 className="font-display text-3xl font-medium tracking-tight">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-base text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
