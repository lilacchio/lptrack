import { NextResponse } from "next/server";
import { getRecap, type RecapInput } from "ai/recap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: RecapInput;
  try {
    body = (await req.json()) as RecapInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body?.player?.pubkey || !body?.winner?.pubkey) {
    return NextResponse.json(
      { error: "player.pubkey and winner.pubkey are required" },
      { status: 400 },
    );
  }
  try {
    const out = await getRecap(body);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "ai failure" },
      { status: 500 },
    );
  }
}
