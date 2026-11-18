import { NextResponse } from "next/server";
import { getVenueById } from "@/lib/services/venue-service";
import { authenticateSession } from "@/lib/auth/require-auth";
import { getSessionTokenFromRequest } from "@/lib/auth/session";
import {
  addDays,
  getVenueCalendar,
  todayInAddis,
} from "@/lib/services/venue-calendar-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/venues/[id]/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Public: for each day in the range (default: today + 29 days, max 62 days),
 * which halls are free for the morning, evening and full-day parts.
 * The owning venue manager additionally receives each day's claims
 * (blocks and bookings) so the mobile calendar can show and release them.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const venue = await getVenueById(id);
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? todayInAddis();
    const to = searchParams.get("to") ?? addDays(from, 29);

    let includeClaims = false;
    if (getSessionTokenFromRequest(req)) {
      const auth = await authenticateSession(req);
      includeClaims = auth.account?.id === venue.managerId;
    }

    try {
      const calendar = await getVenueCalendar(id, from, to, { includeClaims });
      return NextResponse.json({ status: "ok", ...calendar });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid date range";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
