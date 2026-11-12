import { NextResponse } from "next/server";
import { authenticateManager } from "@/lib/auth/require-manager";
import { updateHall, deleteHall } from "@/lib/services/hall-service";

type RouteParams = {
  params: Promise<{ id: string; hallId: string }>;
};

/**
 * PUT /api/venues/[id]/halls/[hallId]
 * Updates a hall. Caller must be the owning manager of the venue.
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { hallId } = await params;
    const auth = await authenticateManager(req);
    if (auth.status !== 200 || !auth.account) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const updated = await updateHall(hallId, auth.account.id, body);

    return NextResponse.json({ status: "ok", hall: updated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update hall";
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/venues/[id]/halls/[hallId]
 * Deletes a hall. Caller must be the owning manager of the venue.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { hallId } = await params;
    const auth = await authenticateManager(req);
    if (auth.status !== 200 || !auth.account) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await deleteHall(hallId, auth.account.id);
    return NextResponse.json({ status: "ok", success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete hall";
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
