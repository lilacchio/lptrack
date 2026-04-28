import { NextResponse } from "next/server";
import { tokenBalance } from "@/lib/lpagent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner");
  if (!owner) {
    return NextResponse.json(
      { status: "error", message: "owner is required" },
      { status: 400 }
    );
  }
  const ca = url.searchParams.get("ca")?.split(",").filter(Boolean);
  try {
    const balances = await tokenBalance(owner, { ca });
    return NextResponse.json({ status: "success", data: balances });
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
