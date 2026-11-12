import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import {
  createTicket,
  listTicketsForAccount,
  listAllTickets,
} from "@/lib/services/ticket-service";
import type { SupportTicketStatus } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { category, subject, message } = body;

    if (!category || typeof category !== "string" || !category.trim()) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const ticket = await createTicket({
      authorId: auth.account.id,
      category: category.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") as SupportTicketStatus) || undefined;

  try {
    if (auth.account.role === "super_admin") {
      const tickets = await listAllTickets({
        callerId: auth.account.id,
        status,
      });
      return NextResponse.json({ tickets });
    } else {
      const tickets = await listTicketsForAccount(auth.account.id);
      return NextResponse.json({ tickets });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
