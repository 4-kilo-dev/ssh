import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { sendMessage } from "@/lib/services/inquiry-service";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await props.params;

  try {
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    const message = await sendMessage({
      conversationId: id,
      senderId: auth.account.id,
      content,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err: any) {
    const msg = err.message || "Failed to send message";
    if (msg.includes("empty") || msg.includes("blank")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.includes("authorized") || msg.includes("Forbidden") || msg.includes("participant")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
