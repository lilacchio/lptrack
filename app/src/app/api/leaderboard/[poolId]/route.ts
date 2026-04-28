import { NextResponse } from "next/server";
import { poolTopLpers } from "@/lib/lpagent/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params;
  try {
    const lpers = await poolTopLpers(poolId, { pageSize: 10 });
    return NextResponse.json({ status: "success", data: lpers });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "unknown" },
      { status: 502 }
    );
  }
}
