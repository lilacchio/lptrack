import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About — LP Arena",
  description:
    "Why LP Arena exists, the technology underneath, and acknowledgements.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-6 pb-32 pt-12">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          about
        </span>
        <h1 className="font-display text-balance text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl">
          LPing is a sport,{" "}
          <em className="italic text-arena-emerald">and</em> nobody&rsquo;s
          keeping score.
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          So we built a scoreboard. LP Arena turns Meteora liquidity provision
          into head-to-head competitions — real positions, real PnL,
          on-chain settlement.
        </p>
      </header>

      <Section eyebrow="why now" title="The thesis">
        <p>
          Meteora&rsquo;s DAMM v2 makes concentrated LPing accessible, but
          there&rsquo;s no cultural surface around it. Traders have leaderboards,
          PFPs, screenshots, alpha groups. LPs have a Discord support channel
          and a spreadsheet. We think LPing is interesting enough to deserve
          its own arenas — and we think LP Agent already has every piece of
          data needed to run one.
        </p>
      </Section>

      <Section eyebrow="the stack" title="What's underneath">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StackCard
            label="Scoring"
            value="LP Agent"
            body="16 endpoints wired — pool discovery, owner positions, top LPs, organic-score safety, position logs, Zap-In/Out trios. Re-ranked every 60s."
          />
          <StackCard
            label="Settlement"
            value="Anchor program"
            body="Custom on-chain pot. Ed25519-signed payload from the scoring oracle settles the leaderboard. Top three split 50/30/20."
            accent="orange"
          />
          <StackCard
            label="LP venue"
            value="Meteora DAMM v2"
            body="Real concentrated liquidity. We don't simulate positions — entrants hold an actual NFT-positioned LP for the duration of the arena."
            accent="sky"
          />
          <StackCard
            label="UI / UX"
            value="Next.js 16 + Fraunces"
            body="Tailwind 4, shadcn base-nova, motion + Lenis smooth scroll, Vercel OG cards, Playwright in CI."
            accent="violet"
          />
        </div>
      </Section>

      <Section eyebrow="safeguards" title="What this is not">
        <ul className="flex flex-col gap-3 text-base text-muted-foreground">
          <li>
            <strong className="text-foreground">Not a casino.</strong> The pot
            is small, the signal is large. Top three split it, and the arena
            settles deterministically off the leaderboard.
          </li>
          <li>
            <strong className="text-foreground">Not a synthetic market.</strong>{" "}
            Every entrant holds a real Meteora position. Win or lose, your fees
            and IL are yours.
          </li>
          <li>
            <strong className="text-foreground">Not a custodian.</strong> The
            Anchor program holds the pot. The scoring oracle signs the payload.
            Settlement is a program call you can read on Solana Explorer.
          </li>
        </ul>
      </Section>

      <Section eyebrow="the maker" title="Built by one person">
        <p>
          LP Arena is a sidetrack entry for the LP Agent API Integrate listing
          on Superteam Earn. Designed, written, and shipped solo over 15 days.
          The full repo, devnet program, and architecture diagrams are public
          on GitHub.
        </p>
        <p>
          Acknowledgements: thanhle27 and the LP Agent team for shipping the
          API in the first place; Meteora for DAMM v2; Helius for the devnet
          RPC; Supabase for the realtime channel.
        </p>
      </Section>

      <div className="flex flex-wrap items-center gap-3 pt-4">
        <Button
          size="lg"
          nativeButton={false}
          className="rounded-full px-7"
          render={<Link href="/" />}
        >
          See the live arenas →
        </Button>
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          className="rounded-full px-6"
          render={<Link href="/help" />}
        >
          How it works
        </Button>
      </div>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </span>
        <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {title}
        </h2>
      </header>
      <div className="flex flex-col gap-3 text-base text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

const ACCENT_BG: Record<string, string> = {
  emerald: "bg-arena-emerald",
  orange: "bg-arena-orange",
  sky: "bg-arena-sky",
  violet: "bg-arena-violet",
};

const ACCENT_TEXT: Record<string, string> = {
  emerald: "text-arena-emerald",
  orange: "text-arena-orange",
  sky: "text-arena-sky",
  violet: "text-arena-violet",
};

function StackCard({
  label,
  value,
  body,
  accent = "emerald",
}: {
  label: string;
  value: string;
  body: string;
  accent?: keyof typeof ACCENT_BG;
}) {
  return (
    <article className="relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-border bg-card p-6">
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-15 blur-3xl ${ACCENT_BG[accent]}`}
      />
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.22em] ${ACCENT_TEXT[accent]}`}
      >
        {label}
      </span>
      <h3 className="font-display text-2xl font-medium tracking-tight">
        {value}
      </h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
