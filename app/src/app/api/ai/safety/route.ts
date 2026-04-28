import { NextResponse } from "next/server";
import { getSafetyInspection, type SafetyInput } from "@/lib/ai/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: SafetyInput;
  try {
    body = (await req.json()) as SafetyInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body?.organicScore !== "number" || !body?.gate) {
    return NextResponse.json(
      { error: "organicScore (number) and gate are required" },
      { status: 400 },
    );
  }
  try {
    const out = await getSafetyInspection(body);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "ai failure" },
      { status: 500 },
    );
  }
}
