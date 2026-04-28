import { ImageResponse } from "next/og";
import { findPoolById } from "@/lib/lpagent/client";
import { arenaThemeFor } from "@/lib/format";

// Known: Next 16 dev + Turbopack on Windows currently emits "failed to pipe
// response" for ImageResponse routes. Works in `next build && next start` and
// in any non-Windows / non-Turbopack dev env. Crawlers read the OG/Twitter
// meta tags injected on /arena/[pubkey] regardless — production rendering
// is what matters. Keeping nodejs runtime so the build is portable.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCENT: Record<string, string> = {
  emerald: "#10b981",
  orange: "#f97316",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
};

const FG = "#fafafa";
const BG = "#0a0a0a";
const MUTED = "#a1a1aa";

function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await params;
  const url = new URL(req.url);
  const rankParam = url.searchParams.get("rank");
  const rank = rankParam ? Number(rankParam) : null;
  const gainParam = url.searchParams.get("gain"); // optional, e.g. "12.4"
  const gain = gainParam ? Number(gainParam) : null;
  const isPostSeason =
    rank !== null && Number.isFinite(rank) && rank >= 1 && rank <= 999;

  const pool = await findPoolById(pubkey).catch(() => null);

  const theme = pool ? arenaThemeFor(pool.pool) : "emerald";
  const accent = ACCENT[theme];
  const pair = pool ? `${pool.token0_symbol} · ${pool.token1_symbol}` : "Arena";
  const protocol = pool?.protocol?.replace("meteora_", "meteora ") ?? "meteora";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: FG,
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: accent,
          }}
        />

        {/* Header — branding */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              letterSpacing: "0.2em",
              color: MUTED,
              textTransform: "uppercase",
            }}
          >
            LP Arena · devnet
          </div>
          <div
            style={{
              fontSize: "20px",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              letterSpacing: "0.18em",
              color: accent,
              textTransform: "uppercase",
              border: `2px solid ${accent}`,
              borderRadius: "8px",
              padding: "8px 16px",
            }}
          >
            {isPostSeason ? `final · #${rank}` : `${theme} arena`}
          </div>
        </div>

        {/* Center — pair (or post-season headline) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              color: MUTED,
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {isPostSeason ? `${pair} · ${protocol}` : protocol}
          </div>
          <div
            style={{
              fontSize: isPostSeason ? "140px" : "120px",
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: isPostSeason ? accent : FG,
            }}
          >
            {isPostSeason
              ? `I ranked #${rank}${
                  gain !== null && Number.isFinite(gain)
                    ? ` · ${gain >= 0 ? "+" : ""}${gain.toFixed(1)}%`
                    : ""
                }`
              : pair}
          </div>
          <div
            style={{
              display: "flex",
              gap: "48px",
              marginTop: "32px",
              fontSize: "32px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  fontSize: "16px",
                  color: MUTED,
                  fontFamily: "JetBrains Mono, ui-monospace, monospace",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                TVL
              </span>
              <span style={{ fontWeight: 500 }}>
                {pool ? fmtUsd(pool.tvl) : "—"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  fontSize: "16px",
                  color: MUTED,
                  fontFamily: "JetBrains Mono, ui-monospace, monospace",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                24h vol
              </span>
              <span style={{ fontWeight: 500 }}>
                {pool ? fmtUsd(pool.vol_24h) : "—"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  fontSize: "16px",
                  color: MUTED,
                  fontFamily: "JetBrains Mono, ui-monospace, monospace",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                fee
              </span>
              <span style={{ fontWeight: 500 }}>
                {pool ? `${pool.fee.toFixed(2)}%` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer — LP Agent attribution */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "32px",
            borderTop: `1px solid ${MUTED}`,
          }}
        >
          <div
            style={{
              fontSize: "28px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ color: MUTED }}>Scored by</span>
            <span style={{ color: accent, fontWeight: 600 }}>LP Agent</span>
          </div>
          <div
            style={{
              fontSize: "20px",
              color: MUTED,
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
            }}
          >
            lp-arena · LPing is a sport now.
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
