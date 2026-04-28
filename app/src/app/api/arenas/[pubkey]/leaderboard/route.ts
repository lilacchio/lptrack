import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await params;
  try {
    const supa = getServerSupabase();
    const { data, error } = await supa
      .from("leaderboard")
      .select("*")
      .eq("arena_pubkey", pubkey)
      .order("rank", { ascending: true })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ status: "success", data: data ?? [] });
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
