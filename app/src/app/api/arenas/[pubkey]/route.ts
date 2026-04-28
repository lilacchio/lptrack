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
      .from("arenas")
      .select("*")
      .eq("pubkey", pubkey)
      .single();
    if (error) {
      // .single() returns 406 when no row — surface as 404.
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { status: "error", message: "not found" },
          { status: 404 }
        );
      }
      throw error;
    }
    return NextResponse.json({ status: "success", data });
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
