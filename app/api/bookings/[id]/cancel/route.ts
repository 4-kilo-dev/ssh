import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { cancelBooking } from "@/lib/services/booking-service";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await props.params;

  let reason: string | undefined;
  try {
    const body = await req.json();
    reason = body?.reason;
  } catch {
    // Body is optional
  }

  try {
    const updated = await cancelBooking({
      bookingId: id,
      callerId: auth.account.id,
      reason,
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    const msg = err.message || "Failed to cancel booking";
    if (msg.includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg.includes("authorized") || msg.includes("Forbidden")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg.includes("already cancelled")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
