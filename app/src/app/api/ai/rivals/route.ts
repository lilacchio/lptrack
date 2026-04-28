import { NextResponse } from "next/server";
import { getRivalSummary, type RivalInput } from "@/lib/ai/rivals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: RivalInput;
  try {
    body = (await req.json()) as RivalInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body?.arenaPoolId || !Array.isArray(body.rivals)) {
    return NextResponse.json(
      { error: "arenaPoolId and rivals[] are required" },
      { status: 400 },
    );
  }
  try {
    const out = await getRivalSummary(body);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "ai failure" },
      { status: 500 },
    );
  }
}
