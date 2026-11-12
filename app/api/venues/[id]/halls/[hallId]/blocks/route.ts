import { NextResponse } from "next/server";
import { authenticateManager } from "@/lib/auth/require-manager";
import {
  createSlotBlock,
  getSlotBlocksByHall,
} from "@/lib/services/slot-block-service";

type RouteParams = {
  params: Promise<{ id: string; hallId: string }>;
};

/**
 * GET /api/venues/[id]/halls/[hallId]/blocks
 * Lists active slot blocks for a hall.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { hallId } = await params;
    const blocks = await getSlotBlocksByHall(hallId);
    return NextResponse.json({ status: "ok", blocks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list slot blocks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/venues/[id]/halls/[hallId]/blocks
 * Creates a manual off-platform slot block on a hall.
 * Requires authenticated owner manager.
 * Returns 409 Conflict on overlap.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { hallId } = await params;
    const auth = await authenticateManager(req);
    if (auth.status !== 200 || !auth.account) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { startTime, endTime, reason } = body;

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for startTime or endTime" },
        { status: 400 }
      );
    }

    const block = await createSlotBlock({
      managerId: auth.account.id,
      hallId,
      startTime: start,
      endTime: end,
      reason,
    });

    return NextResponse.json({ status: "ok", block }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create slot block";
    let status = 400;
    if (message.includes("Unauthorized")) {
      status = 403;
    } else if (
      message.includes("Double-booking") ||
      message.includes("exclusion") ||
      message.includes("overlapping")
    ) {
      status = 409;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
