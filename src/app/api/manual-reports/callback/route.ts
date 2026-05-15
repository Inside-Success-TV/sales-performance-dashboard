import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyManualFeedbackCallback, hasDatabase } from "@/lib/db";
import { normalizeManualCallback } from "@/lib/manual-reports";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.MANUAL_FEEDBACK_SECRET || process.env.INGEST_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "MANUAL_FEEDBACK_SECRET or INGEST_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const payload = normalizeManualCallback(body);
    const report = await applyManualFeedbackCallback(payload);

    if (!report) {
      return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, public_id: report.public_id, status: report.status });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Manual report callback failed" },
      { status: 400 },
    );
  }
}
