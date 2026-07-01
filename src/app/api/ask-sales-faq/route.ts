import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAskSalesFaqAccess } from "@/lib/ask-sales-faq/access";
import { runAskSalesFaq } from "@/lib/ask-sales-faq/runtime";
import type { AskSalesFaqResponse } from "@/lib/ask-sales-faq/types";
import { ensureAskSalesFaqStorage, saveAskSalesFaqExchange } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z.object({
  conversationId: z.string().trim().min(1).max(120).optional().nullable(),
  clientRequestId: z.string().trim().max(120).optional().nullable(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(8000),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const access = getAskSalesFaqAccess(session);

  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.message, code: access.code }, { status: access.status });
  }

  let payload: z.infer<typeof requestSchema>;
  try {
    payload = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Send a valid Ask Sales FAQ message.", code: "validation_error" },
      { status: 400 },
    );
  }

  const messages = payload.messages.map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
  const lastMessage = messages.at(-1);

  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json(
      { ok: false, error: "Send a question before asking Ask Sales FAQ.", code: "validation_error" },
      { status: 400 },
    );
  }

  const conversationId = payload.conversationId || `faq_${randomUUID()}`;
  const userMessageId = `faq_user_${randomUUID()}`;
  const assistantMessageId = `faq_assistant_${randomUUID()}`;

  try {
    const storageReady = await ensureAskSalesFaqStorage();
    if (!storageReady) {
      return NextResponse.json(buildSafeConfiguredResponse(conversationId, assistantMessageId));
    }

    const result = await runAskSalesFaq(lastMessage.content);
    const response: AskSalesFaqResponse = {
      ok: true,
      conversationId,
      messageId: assistantMessageId,
      answer: result.answer,
      outcome: result.outcome,
      source: result.source,
      model: result.model,
      provider: result.provider,
      needsRoute: result.needsRoute,
      routeReason: result.routeReason,
      redactions: result.redactions,
      latencyMs: result.latencyMs,
    };

    await saveAskSalesFaqExchange({
      conversationId,
      userMessageId,
      assistantMessageId,
      viewerEmail: access.viewerEmail,
      viewerName: access.viewerName,
      title: buildConversationTitle(result.sanitizedQuestion),
      questionRedacted: result.sanitizedQuestion,
      answerRedacted: result.answer,
      redactions: result.redactions,
      outcome: result.outcome,
      matchedArticleId: result.matchedArticleId,
      sourceLabel: result.source?.label || null,
      sourceLastReviewed: result.source?.lastReviewed || null,
      needsRoute: result.needsRoute,
      routeReason: result.routeReason,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      errorClass: result.errorClass,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Ask Sales FAQ request failed", error);
    return NextResponse.json(buildSafeConfiguredResponse(conversationId, assistantMessageId));
  }
}

function buildConversationTitle(question: string) {
  const words = question.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, 9);
  const title = words.join(" ");
  return title.length > 4 ? title : "Ask Sales FAQ chat";
}

function buildSafeConfiguredResponse(conversationId: string, messageId: string): AskSalesFaqResponse {
  return {
    ok: true,
    conversationId,
    messageId,
    answer:
      "Ask Sales FAQ is not fully available right now, so do not rely on a generated answer. Please check the approved source or route the question before replying.",
    outcome: "safe_fallback",
    source: null,
    model: null,
    provider: null,
    needsRoute: true,
    routeReason: "Ask Sales FAQ storage or runtime configuration is not available.",
    redactions: [],
    latencyMs: 0,
  };
}
