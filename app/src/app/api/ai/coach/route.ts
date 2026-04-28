import { NextResponse } from "next/server";
import { getCoachSuggestion, type CoachInput } from "@/lib/ai/coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: CoachInput;
  try {
    body = (await req.json()) as CoachInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body?.poolId || typeof body.activeBin !== "number") {
    return NextResponse.json(
      { error: "poolId and activeBin are required" },
      { status: 400 },
    );
  }
  try {
    const out = await getCoachSuggestion(body);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "ai failure" },
      { status: 500 },
    );
  }
}
