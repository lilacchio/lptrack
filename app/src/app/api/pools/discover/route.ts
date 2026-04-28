import { NextResponse } from "next/server";
import { topPoolsByTvl } from "@/lib/lpagent/client";

export const revalidate = 60;

export async function GET() {
  try {
    const pools = await topPoolsByTvl(8);
    return NextResponse.json({ status: "success", data: pools });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { status: "error", message },
      { status: 502 }
    );
  }
}
