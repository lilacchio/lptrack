import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Connect a wallet — LP Arena",
};

export default function NotConnectedPage() {
  const featuredArena = process.env.NEXT_PUBLIC_FEATURED_ARENA;
  const ctaHref = featuredArena ? `/arena/${featuredArena}/enter` : "/";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[#070912] p-10 text-white shadow-xl sm:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[24rem] w-[24rem] rounded-full bg-arena-emerald opacity-25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 h-[20rem] w-[20rem] rounded-full bg-arena-violet opacity-15 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-arena-emerald opacity-80"
        />

        <div className="relative flex flex-col gap-6">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-arena-emerald" />
            <span className="font-mono uppercase tracking-[0.22em] text-white/75">
              wallet required
            </span>
          </span>

          <h1
            data-testid="not-connected-headline"
            className="font-display text-balance text-5xl font-light leading-[1.05] tracking-[-0.02em] sm:text-6xl"
          >
            Connect a wallet to{" "}
            <em className="italic text-arena-emerald">enter</em> the arena.
          </h1>

          <p className="max-w-lg text-balance text-base text-white/70">
            Browsing arenas, leaderboards, and profiles is open to anyone.
            Entering, signing settlement, and claiming a payout all go through
            your wallet — Phantom and Solflare on devnet today.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              nativeButton={false}
              className="rounded-full !bg-white px-7 !text-[#070912] hover:!bg-white/85 hover:!text-[#070912]"
              render={<Link href={ctaHref} />}
            >
              Take me to a live arena →
            </Button>
            <Button
              size="lg"
              variant="ghost"
              nativeButton={false}
              className="rounded-full border border-white/20 px-6 text-white/85 hover:bg-white/10 hover:text-white"
              render={<Link href="/" />}
            >
              ← Back to arenas
            </Button>
          </div>

          <ul className="grid grid-cols-1 gap-3 pt-6 sm:grid-cols-3">
            {[
              { label: "Network", value: "Solana devnet" },
              { label: "Wallets", value: "Phantom · Solflare" },
              { label: "Cost to browse", value: "Free, no signature" },
            ].map((p) => (
              <li
                key={p.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                  {p.label}
                </div>
                <div className="text-sm text-white/85">{p.value}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
