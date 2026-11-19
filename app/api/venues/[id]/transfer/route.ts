import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { transferVenueOwnership } from "@/lib/services/venue-staff-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/venues/[id]/transfer
 * Transfers primary ownership of the venue to another account (by phone number or account ID).
 * Caller must be the current primary owner or super_admin.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { newOwnerPhoneOrId } = body;

    if (!newOwnerPhoneOrId || typeof newOwnerPhoneOrId !== "string") {
      return NextResponse.json(
        { error: "newOwnerPhoneOrId (phone number or account ID) is required" },
        { status: 400 }
      );
    }

    const venue = await transferVenueOwnership({
      venueId: id,
      newOwnerPhoneOrId,
      callerId: auth.account.id,
      callerRole: auth.account.role,
    });

    return NextResponse.json({
      status: "ok",
      message: "Venue ownership transferred successfully",
      venue,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to transfer ownership";
    const status = message.includes("Unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
