import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ARENAS = [
  {
    key: "emerald",
    label: "SOL · USDC",
    bg: "bg-arena-emerald",
    fg: "text-arena-emerald-foreground",
    text: "text-arena-emerald",
    ring: "ring-arena-emerald/40",
  },
  {
    key: "orange",
    label: "JUP · SOL",
    bg: "bg-arena-orange",
    fg: "text-arena-orange-foreground",
    text: "text-arena-orange",
    ring: "ring-arena-orange/40",
  },
  {
    key: "sky",
    label: "JTO · USDC",
    bg: "bg-arena-sky",
    fg: "text-arena-sky-foreground",
    text: "text-arena-sky",
    ring: "ring-arena-sky/40",
  },
  {
    key: "violet",
    label: "DBC memecoin",
    bg: "bg-arena-violet",
    fg: "text-arena-violet-foreground",
    text: "text-arena-violet",
    ring: "ring-arena-violet/40",
  },
] as const;

export default function StyleguidePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          internal · design tokens
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Styleguide</h1>
        <p className="text-muted-foreground">
          Sanity check for the four arena accent themes, font stack, and base
          shadcn primitives. Throwaway page — pixel-tested by Playwright.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Arena accents</h2>
        <div
          data-testid="arena-swatches"
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {ARENAS.map((a) => (
            <div
              key={a.key}
              data-testid={`arena-swatch-${a.key}`}
              className={`flex h-32 flex-col justify-between rounded-lg p-4 ring-1 ${a.bg} ${a.fg} ${a.ring}`}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
                arena/{a.key}
              </span>
              <span className="text-base font-medium">{a.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Typography</h2>
        <Card>
          <CardHeader>
            <CardTitle data-testid="font-sans-sample">
              Inter Tight — the sans
            </CardTitle>
            <CardDescription>
              Headings and body. Variable font, swap display.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              data-testid="font-mono-sample"
              className="font-mono text-sm text-muted-foreground"
            >
              JetBrains Mono — 0123456789 abcdefghij
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Components</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ARENAS.map((a) => (
            <Badge
              key={a.key}
              variant="outline"
              className={`${a.text} border-current`}
            >
              {a.key}
            </Badge>
          ))}
        </div>
      </section>
    </main>
  );
}
