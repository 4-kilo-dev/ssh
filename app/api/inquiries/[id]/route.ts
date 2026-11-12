import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import {
  getConversationById,
  getConversationMessages,
} from "@/lib/services/inquiry-service";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await props.params;

  try {
    const conversation = await getConversationById({
      conversationId: id,
      callerId: auth.account.id,
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Privacy Invariant: Super admin sees metadata, but private message contents are excluded
    if (auth.account.role === "super_admin") {
      return NextResponse.json({
        conversation,
        messages: [],
      });
    }

    const messages = await getConversationMessages({
      conversationId: id,
      callerId: auth.account.id,
    });

    return NextResponse.json({
      conversation,
      messages,
    });
  } catch (err: any) {
    const msg = err.message || "Failed to get inquiry";
    if (msg.includes("authorized") || msg.includes("Forbidden") || msg.includes("permission") || msg.includes("restricted")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
