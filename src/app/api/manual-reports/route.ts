import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createManualFeedbackReport, hasDatabase, updateManualFeedbackStatus } from "@/lib/db";
import { isManualFeedbackEnabled, manualSubmitSchema } from "@/lib/manual-reports";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isManualFeedbackEnabled()) {
    return NextResponse.json({ ok: false, error: "Manual feedback is disabled" }, { status: 404 });
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  try {
    const webhookUrl =
      process.env.MANUAL_FEEDBACK_WEBHOOK_URL ||
      "https://insidesuccess.app.n8n.cloud/webhook/manual-sales-feedback";
    const body = await request.json();
    const payload = manualSubmitSchema.parse(body);
    const publicId = randomUUID().replace(/-/g, "");

    await createManualFeedbackReport(publicId, payload);

    if (!webhookUrl) {
      await updateManualFeedbackStatus(
        publicId,
        "failed",
        "Manual feedback workflow URL is not configured.",
      );
      return NextResponse.json({ ok: true, public_id: publicId, status: "failed" });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const callbackUrl = new URL("/api/manual-reports/callback", origin).toString();
    const reportUrl = new URL(`/self-report/${publicId}`, origin).toString();

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-manual-feedback-source": "sales-performance-dashboard",
        },
        body: JSON.stringify({
          public_id: publicId,
          callback_url: callbackUrl,
          report_url: reportUrl,
          rep_name: payload.rep_name,
          rep_email: payload.rep_email,
          client_name: payload.client_name,
          input_type: payload.input_type,
          transcript_text: payload.input_type === "transcript" ? payload.transcript_text : null,
          zoom_link: payload.input_type === "zoom_link" ? payload.zoom_link : null,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        await updateManualFeedbackStatus(
          publicId,
          "failed",
          `Manual feedback workflow rejected the request with HTTP ${response.status}.`,
        );
        return NextResponse.json({ ok: true, public_id: publicId, status: "failed" });
      }

      await updateManualFeedbackStatus(publicId, "processing");
      return NextResponse.json({ ok: true, public_id: publicId, status: "processing" });
    } catch (error) {
      await updateManualFeedbackStatus(
        publicId,
        "failed",
        error instanceof Error ? error.message : "Manual feedback workflow could not be reached.",
      );
      return NextResponse.json({ ok: true, public_id: publicId, status: "failed" });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Manual report creation failed" },
      { status: 400 },
    );
  }
}
