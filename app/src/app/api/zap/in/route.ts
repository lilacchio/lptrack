import { NextResponse } from "next/server";
import { zapInBuild, type ZapInRequest } from "@/lib/lpagent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: ZapInRequest;
  try {
    body = (await req.json()) as ZapInRequest;
  } catch {
    return NextResponse.json(
      { status: "error", message: "invalid JSON" },
      { status: 400 }
    );
  }

  if (!body.poolId || !body.owner) {
    return NextResponse.json(
      { status: "error", message: "poolId and owner are required" },
      { status: 400 }
    );
  }

  try {
    const out = await zapInBuild(body);
    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { status: "error", message },
      { status: 502 }
    );
  }
}
