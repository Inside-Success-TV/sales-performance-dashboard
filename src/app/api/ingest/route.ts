import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { normalizeIngestPayload } from "@/lib/ingest";
import { hasDatabase, upsertPerformanceCall } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.INGEST_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "INGEST_SECRET is not configured" },
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
    const payload = normalizeIngestPayload(body);
    const call = await upsertPerformanceCall(payload);

    return NextResponse.json({
      ok: true,
      id: call.id,
      airtable_record_id: call.airtable_record_id,
      rep_slug: call.rep_slug,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 400 },
    );
  }
}
