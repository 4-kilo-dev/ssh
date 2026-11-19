import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { getVenueForAccount } from "@/lib/services/venue-staff-service";
import { listVenueStaff, checkVenueAccess } from "@/lib/services/venue-staff-service";

/**
 * GET /api/venues/managed
 * Returns the venue managed by the current authenticated caller,
 * whether they are the primary owner or an active staff member.
 */
export async function GET(req: Request) {
  try {
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const venue = await getVenueForAccount(auth.account.id);
    if (!venue) {
      return NextResponse.json({ status: "ok", venue: null });
    }

    const access = await checkVenueAccess(venue.id, auth.account.id, "receptionist");
    const staff = await listVenueStaff(venue.id);

    return NextResponse.json({
      status: "ok",
      venue,
      role: access.role || "manager",
      isPrimaryOwner: access.isPrimaryOwner,
      staff,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load managed venue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
