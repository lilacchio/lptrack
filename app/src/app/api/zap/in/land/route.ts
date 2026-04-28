import { NextResponse } from "next/server";
import { zapInLand, type ZapInLandRequest } from "@/lib/lpagent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: ZapInLandRequest;
  try {
    body = (await req.json()) as ZapInLandRequest;
  } catch {
    return NextResponse.json(
      { status: "error", message: "invalid JSON" },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(body.addLiquidityTxsWithJito) ||
    body.addLiquidityTxsWithJito.length === 0 ||
    !body.lastValidBlockHeight
  ) {
    return NextResponse.json(
      {
        status: "error",
        message:
          "addLiquidityTxsWithJito (non-empty) + lastValidBlockHeight required",
      },
      { status: 400 }
    );
  }

  try {
    const out = await zapInLand(body);
    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { status: "error", message },
      { status: 502 }
    );
  }
}
