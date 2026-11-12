import { NextResponse } from "next/server";
import { authenticateManager } from "@/lib/auth/require-manager";
import { getVenueById, updateVenue, deleteVenue } from "@/lib/services/venue-service";
import { getHallsByVenueId } from "@/lib/services/hall-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/venues/[id]
 * Public endpoint: returns venue details and all bookable halls.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const venue = await getVenueById(id);

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const halls = await getHallsByVenueId(id);
    return NextResponse.json({ status: "ok", venue, halls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get venue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/venues/[id]
 * Updates venue details. Caller must be the owning venue_manager.
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateManager(req);
    if (auth.status !== 200 || !auth.account) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const updated = await updateVenue(id, auth.account.id, body);

    return NextResponse.json({ status: "ok", venue: updated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update venue";
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/venues/[id]
 * Deletes venue and cascades to halls. Caller must be the owning venue_manager.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateManager(req);
    if (auth.status !== 200 || !auth.account) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await deleteVenue(id, auth.account.id);
    return NextResponse.json({ status: "ok", success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete venue";
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
