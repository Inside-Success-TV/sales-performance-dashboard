import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAskSalesFaqAccess } from "@/lib/ask-sales-faq/access";
import { deleteAskSalesFaqConversationForViewer, renameAskSalesFaqConversation } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(90),
});

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const access = getAskSalesFaqAccess(session);

  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.message, code: access.code }, { status: access.status });
  }

  const { conversationId } = await context.params;
  let payload: z.infer<typeof updateSchema>;

  try {
    payload = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Send a valid chat title." }, { status: 400 });
  }

  try {
    const updated = await renameAskSalesFaqConversation({
      conversationId,
      viewerEmail: access.viewerEmail,
      title: payload.title,
    });

    if (!updated) {
      return NextResponse.json({ ok: false, error: "Chat was not found for this account." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, conversationId, title: payload.title });
  } catch (error) {
    console.error("Ask Sales FAQ rename failed", error);
    return NextResponse.json({ ok: false, error: "Chat could not be renamed right now." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  const access = getAskSalesFaqAccess(session);

  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.message, code: access.code }, { status: access.status });
  }

  const { conversationId } = await context.params;

  try {
    const deleted = await deleteAskSalesFaqConversationForViewer({
      conversationId,
      viewerEmail: access.viewerEmail,
    });

    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Chat was not found for this account." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, conversationId, retainedInBackend: true });
  } catch (error) {
    console.error("Ask Sales FAQ delete failed", error);
    return NextResponse.json({ ok: false, error: "Chat could not be deleted right now." }, { status: 500 });
  }
}
