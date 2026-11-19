import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { listVenuesForAccount, listVenueStaff, checkVenueAccess } from "@/lib/services/venue-staff-service";

/**
 * GET /api/venues/managed
 * Returns the venue(s) managed by the current authenticated caller (supports multi-venue groups).
 * Accepts optional ?venueId=... to switch active venue context.
 */
export async function GET(req: Request) {
  try {
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const allVenues = await listVenuesForAccount(auth.account.id);
    if (allVenues.length === 0) {
      return NextResponse.json({ status: "ok", venue: null, venues: [] });
    }

    const { searchParams } = new URL(req.url);
    const requestedVenueId = searchParams.get("venueId");

    let venue = allVenues[0];
    if (requestedVenueId) {
      const match = allVenues.find((v) => v.id === requestedVenueId);
      if (match) venue = match;
    }

    const access = await checkVenueAccess(venue.id, auth.account.id, "receptionist");
    const staff = await listVenueStaff(venue.id);

    return NextResponse.json({
      status: "ok",
      venue,
      venues: allVenues,
      role: access.role || "manager",
      isPrimaryOwner: access.isPrimaryOwner,
      staff,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load managed venue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
