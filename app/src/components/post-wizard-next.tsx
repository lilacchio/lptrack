"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

type PostWizardNextProps = {
  arenaPubkey: string;
};

const ITEM_BASE =
  "group flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/50 p-5 transition-colors hover:border-border hover:bg-card";

export function PostWizardNext({ arenaPubkey }: PostWizardNextProps) {
  const { publicKey } = useWallet();

  const items: Array<{ href: string; eyebrow: string; title: string; body: string }> = [
    {
      href: `/arena/${arenaPubkey}`,
      eyebrow: "track your run",
      title: "Live leaderboard →",
      body: "Watch the rank shift every minute as LP Agent re-scores the field.",
    },
  ];
  if (publicKey) {
    items.push({
      href: `/profile/${publicKey.toBase58()}`,
      eyebrow: "your stats",
      title: "Your profile →",
      body: "Lifetime PnL, equity curve, trophy case, and on-chain action log.",
    });
    items.push({
      href: `/arena/${arenaPubkey}/claim`,
      eyebrow: "after the bell",
      title: "Claim payout →",
      body: "Once the arena settles, top-3 finishers can claim from this page.",
    });
  }
  items.push({
    href: "/arenas",
    eyebrow: "every season",
    title: "Archive →",
    body: "Browse every arena that's run on LP Arena, lifecycle-grouped.",
  });

  return (
    <section className="flex flex-col gap-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        what&rsquo;s next
      </span>
      <h2 className="font-display text-2xl font-medium tracking-tight">
        You&rsquo;re in. Now the arena <em className="italic text-muted-foreground">watches itself.</em>
      </h2>
      <p className="max-w-xl text-sm text-muted-foreground">
        Your on-chain entry locks in the buy-in. From here, LP Agent re-scores
        every minute, the leaderboard updates live, and the bell rings on
        settlement automatically.
      </p>
      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={ITEM_BASE}>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {it.eyebrow}
            </span>
            <span className="text-base font-medium tracking-tight transition-colors group-hover:text-foreground">
              {it.title}
            </span>
            <span className="text-sm text-muted-foreground">{it.body}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
