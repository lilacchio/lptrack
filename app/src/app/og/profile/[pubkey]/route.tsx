import { ImageResponse } from "next/og";
import { ownerOverview } from "@/lib/lpagent/client";
import { arenaThemeFor } from "@/lib/format";

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
  if (!Number.isFinite(n) || n === 0) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await params;
  const overview = await ownerOverview(pubkey).catch(() => []);
  const o = overview[0];

  const theme = arenaThemeFor(pubkey);
  const accent = ACCENT[theme];
  const lifetimePnl = o?.total_pnl?.ALL ?? 0;
  const lifetimeFee = o?.total_fee?.ALL ?? 0;
  const lifetimeInflow = o?.total_inflow ?? 0;
  const roi =
    lifetimeInflow > 0 ? (lifetimePnl / lifetimeInflow) * 100 : 0;
  const tone = lifetimePnl > 0 ? accent : lifetimePnl < 0 ? "#ef4444" : FG;

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
            LP Arena · profile
          </div>
          <div
            style={{
              fontSize: "20px",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              color: accent,
            }}
          >
            {shortAddr(pubkey)}
          </div>
        </div>

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
            lifetime LP performance
          </div>
          <div
            style={{
              fontSize: "140px",
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: tone,
            }}
          >
            {lifetimePnl >= 0 ? "+" : ""}
            {fmtUsd(Math.abs(lifetimePnl))}
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
                ROI
              </span>
              <span style={{ fontWeight: 500 }}>
                {roi >= 0 ? "+" : ""}
                {roi.toFixed(2)}%
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
                fees
              </span>
              <span style={{ fontWeight: 500 }}>{fmtUsd(lifetimeFee)}</span>
            </div>
          </div>
        </div>

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
    { width: 1200, height: 630 }
  );
}
