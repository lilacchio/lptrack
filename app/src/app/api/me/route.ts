import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/me?pubkey=...
 *
 * Returns the player's stats cache + recent entries. Public endpoint —
 * the URL is the wallet address; no auth required (the wallet's pubkey
 * is the identity).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pubkey = url.searchParams.get("pubkey");
  if (!pubkey) {
    return NextResponse.json(
      { status: "error", message: "?pubkey=... required" },
      { status: 400 }
    );
  }
  try {
    const supa = getServerSupabase();
    const [statsRes, entriesRes] = await Promise.all([
      supa.from("player_stats_cache").select("*").eq("pubkey", pubkey).maybeSingle(),
      supa
        .from("entries")
        .select("*")
        .eq("player_pubkey", pubkey)
        .order("joined_at", { ascending: false })
        .limit(20),
    ]);
    if (statsRes.error) throw statsRes.error;
    if (entriesRes.error) throw entriesRes.error;
    return NextResponse.json({
      status: "success",
      data: {
        stats: statsRes.data,
        entries: entriesRes.data ?? [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 }
    );
  }
}
