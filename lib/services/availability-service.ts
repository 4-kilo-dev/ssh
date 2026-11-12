/**
 * Availability Service — Phase 4
 *
 * Implements derived availability:
 * - There is no 'available' boolean stored in the database.
 * - Availability is derived dynamically at query time by checking active time claims.
 * - Supports single-hall checks, multi-hall venue queries, and daily timeline schedules.
 */

import { eq, and, lt, gt } from "drizzle-orm";
import { getDb } from "../db/client";
import { slotClaims, type SlotClaim, type Hall } from "../db/schema";
import { getHallsByVenueId } from "./hall-service";

export interface HallAvailabilityResult {
  available: boolean;
  conflict: {
    claimId: string;
    claimType: string;
    reason: string | null;
    startTime: Date;
    endTime: Date;
  } | null;
}

export interface HourlySlotStatus {
  hour: number;
  timeLabel: string;
  startTime: Date;
  endTime: Date;
  status: "free" | "held";
  claimType?: string;
  reason?: string | null;
}

export interface HallDailyTimeline {
  hallId: string;
  date: string;
  slots: HourlySlotStatus[];
}

/**
 * Checks whether a hall is available for a requested time range [startTime, endTime).
 * Derived dynamically: free ONLY IF no active claim overlaps.
 */
export async function checkHallAvailability(
  hallId: string,
  startTime: Date,
  endTime: Date
): Promise<HallAvailabilityResult> {
  if (startTime >= endTime) {
    throw new Error("Start time must be strictly before end time");
  }

  const db = getDb();

  // Two half-open intervals [A, B) and [C, D) overlap iff (A < D) and (B > C)
  const [conflict] = await db
    .select()
    .from(slotClaims)
    .where(
      and(
        eq(slotClaims.hallId, hallId),
        eq(slotClaims.status, "active"),
        lt(slotClaims.startTime, endTime),
        gt(slotClaims.endTime, startTime)
      )
    )
    .limit(1);

  if (conflict) {
    return {
      available: false,
      conflict: {
        claimId: conflict.id,
        claimType: conflict.claimType,
        reason: conflict.reason,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
      },
    };
  }

  return {
    available: true,
    conflict: null,
  };
}

/**
 * Finds all halls in a venue that are available for a requested time range.
 */
export async function findAvailableHalls(
  venueId: string,
  startTime: Date,
  endTime: Date
): Promise<Hall[]> {
  const halls = await getHallsByVenueId(venueId);
  const availableHalls: Hall[] = [];

  for (const hall of halls) {
    const { available } = await checkHallAvailability(hall.id, startTime, endTime);
    if (available) {
      availableHalls.push(hall);
    }
  }

  return availableHalls;
}

/**
 * Builds an hourly availability timeline for a hall on a specific date (YYYY-MM-DD).
 * Evaluates hourly blocks from 08:00 to 22:00 in East Africa Time (+03:00).
 */
export async function getHallAvailabilityTimeline(
  hallId: string,
  dateStr: string
): Promise<HallDailyTimeline> {
  const db = getDb();

  // Start at 08:00 EAT and end at 22:00 EAT
  const dayStart = new Date(`${dateStr}T08:00:00+03:00`);
  const dayEnd = new Date(`${dateStr}T22:00:00+03:00`);

  // Query all active claims overlapping this day
  const claims = await db
    .select()
    .from(slotClaims)
    .where(
      and(
        eq(slotClaims.hallId, hallId),
        eq(slotClaims.status, "active"),
        lt(slotClaims.startTime, dayEnd),
        gt(slotClaims.endTime, dayStart)
      )
    );

  const slots: HourlySlotStatus[] = [];

  for (let hour = 8; hour < 22; hour++) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const slotStart = new Date(`${dateStr}T${pad(hour)}:00:00+03:00`);
    const slotEnd = new Date(`${dateStr}T${pad(hour + 1)}:00:00+03:00`);

    // Check if any claim overlaps [slotStart, slotEnd)
    const activeClaim = claims.find(
      (c) => c.startTime < slotEnd && c.endTime > slotStart
    );

    slots.push({
      hour,
      timeLabel: `${pad(hour)}:00 - ${pad(hour + 1)}:00`,
      startTime: slotStart,
      endTime: slotEnd,
      status: activeClaim ? "held" : "free",
      claimType: activeClaim?.claimType,
      reason: activeClaim?.reason,
    });
  }

  return {
    hallId,
    date: dateStr,
    slots,
  };
}
