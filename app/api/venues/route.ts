import { NextResponse } from "next/server";
import { authenticateManager } from "@/lib/auth/require-manager";
import { createVenue, listVenues } from "@/lib/services/venue-service";

/**
 * GET /api/venues
 * Public directory listing with optional query filters (area, type, search query).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const area = searchParams.get("area") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const query = searchParams.get("query") ?? undefined;

    const venues = await listVenues({ area, type, query });
    return NextResponse.json({ status: "ok", venues });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list venues";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/venues
 * Creates a new venue. Caller must be an authenticated venue_manager.
 */
export async function POST(req: Request) {
  try {
    const auth = await authenticateManager(req);
    if (auth.status !== 200 || !auth.account) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { name, area, type, description, contactPhone, contactEmail, policies, amenities, photos } = body;

    if (!name || !area || !type) {
      return NextResponse.json(
        { error: "name, area, and type are required" },
        { status: 400 }
      );
    }

    const venue = await createVenue({
      managerId: auth.account.id,
      name,
      area,
      type,
      description,
      contactPhone,
      contactEmail,
      policies,
      amenities,
      photos,
    });

    return NextResponse.json({ status: "ok", venue }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create venue";
    const status = message.includes("already owns") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
