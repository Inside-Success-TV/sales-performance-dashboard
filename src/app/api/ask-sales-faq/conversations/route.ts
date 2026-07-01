import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAskSalesFaqAccess } from "@/lib/ask-sales-faq/access";
import { getAskSalesFaqConversations } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const access = getAskSalesFaqAccess(session);

  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.message, code: access.code }, { status: access.status });
  }

  try {
    const conversations = await getAskSalesFaqConversations(access.viewerEmail, 20);
    return NextResponse.json({ ok: true, conversations });
  } catch (error) {
    console.error("Ask Sales FAQ conversation history failed", error);
    return NextResponse.json({ ok: true, conversations: [] });
  }
}
