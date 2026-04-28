import Link from "next/link";
import { ConnectButton } from "@/components/connect-button";

const NAV_LINKS = [
  { href: "/", label: "Arenas" },
  { href: "/arenas", label: "Archive" },
  { href: "/about", label: "About" },
  { href: "/help", label: "How it works" },
  { href: "/faq", label: "FAQ" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-arena-emerald" />
          lp-arena
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.slice(1).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}
