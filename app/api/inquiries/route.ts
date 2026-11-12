import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import {
  createConversation,
  listConversationsForAccount,
} from "@/lib/services/inquiry-service";

export async function POST(req: Request) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { venueId, subject, initialMessage } = body;

    if (!venueId || !initialMessage) {
      return NextResponse.json(
        { error: "venueId and initialMessage are required" },
        { status: 400 }
      );
    }

    const conv = await createConversation({
      venueId,
      customerId: auth.account.id,
      subject,
      initialMessage,
    });

    return NextResponse.json(conv, { status: 201 });
  } catch (err: any) {
    const msg = err.message || "Failed to create inquiry";
    if (msg.includes("empty") || msg.includes("blank") || msg.includes("required")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const convs = await listConversationsForAccount(auth.account.id);
    return NextResponse.json(convs);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list inquiries" },
      { status: 500 }
    );
  }
}
