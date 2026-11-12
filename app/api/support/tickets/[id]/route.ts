import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import {
  getTicketById,
  updateTicketStatus,
} from "@/lib/services/ticket-service";
import type { SupportTicketStatus } from "@/lib/db/schema";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const ticket = await getTicketById(id, auth.account.id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (err: any) {
    if (err.message?.includes("Not authorized")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.account.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const { status, adminNotes } = body;

    const validStatuses: SupportTicketStatus[] = ["open", "in_progress", "resolved"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status: must be open, in_progress, or resolved" },
        { status: 400 }
      );
    }

    const updated = await updateTicketStatus({
      ticketId: id,
      callerId: auth.account.id,
      status: status as SupportTicketStatus,
      adminNotes: adminNotes ?? undefined,
    });

    return NextResponse.json({ ticket: updated });
  } catch (err: any) {
    if (err.message?.includes("Ticket not found")) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
