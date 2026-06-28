import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { Id } from "convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = (await req.json()) as { campaignId: Id<"campaigns"> };
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    }

    await runPipeline(campaignId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
