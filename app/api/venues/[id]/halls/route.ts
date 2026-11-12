import { NextResponse } from "next/server";
import { authenticateManager } from "@/lib/auth/require-manager";
import { createHall, getHallsByVenueId } from "@/lib/services/hall-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/venues/[id]/halls
 * Lists all halls belonging to a venue.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const halls = await getHallsByVenueId(id);
    return NextResponse.json({ status: "ok", halls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list halls";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/venues/[id]/halls
 * Creates a new hall under the venue. Caller must be the owning manager.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateManager(req);
    if (auth.status !== 200 || !auth.account) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { name, capacity, setting, notes } = body;

    if (!name || capacity === undefined) {
      return NextResponse.json(
        { error: "name and capacity are required" },
        { status: 400 }
      );
    }

    const hall = await createHall(auth.account.id, {
      venueId: id,
      name,
      capacity: Number(capacity),
      setting,
      notes,
    });

    return NextResponse.json({ status: "ok", hall }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create hall";
    const status = message.includes("Unauthorized") ? 403 : message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
