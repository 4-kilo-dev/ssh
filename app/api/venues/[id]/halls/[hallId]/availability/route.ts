import { NextResponse } from "next/server";
import {
  checkHallAvailability,
  getHallAvailabilityTimeline,
} from "@/lib/services/availability-service";

type RouteParams = {
  params: Promise<{ id: string; hallId: string }>;
};

/**
 * GET /api/venues/[id]/halls/[hallId]/availability
 * Public endpoint to query derived availability for a hall.
 * Supports:
 * - date=YYYY-MM-DD -> returns hourly breakdown
 * - startTime=ISO&endTime=ISO -> returns { available: boolean, conflict: ... }
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { hallId } = await params;
    const { searchParams } = new URL(req.url);

    const dateParam = searchParams.get("date");
    if (dateParam) {
      const timeline = await getHallAvailabilityTimeline(hallId, dateParam);
      return NextResponse.json({ status: "ok", timeline });
    }

    const startParam = searchParams.get("startTime");
    const endParam = searchParams.get("endTime");

    if (startParam && endParam) {
      const startTime = new Date(startParam);
      const endTime = new Date(endParam);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return NextResponse.json(
          { error: "Invalid startTime or endTime format" },
          { status: 400 }
        );
      }

      const result = await checkHallAvailability(hallId, startTime, endTime);
      return NextResponse.json({
        status: "ok",
        available: result.available,
        conflict: result.conflict,
      });
    }

    return NextResponse.json(
      { error: "Provide either ?date=YYYY-MM-DD or ?startTime=...&endTime=..." },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to query availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
