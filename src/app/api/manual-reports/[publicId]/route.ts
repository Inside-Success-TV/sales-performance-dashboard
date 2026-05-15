import { NextRequest, NextResponse } from "next/server";
import { getManualFeedbackReport } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await context.params;
  const report = await getManualFeedbackReport(publicId);

  if (!report) {
    return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, report });
}
