/**
 * Venue Calendar Service
 *
 * One call answers "which halls of this venue are free on which days?" for a
 * date range, using the same derived-availability rule as availability-service
 * (a time window is free only if no active slot claim overlaps it).
 *
 * Days are split into three fixed parts in East Africa Time (+03:00, no DST):
 *   morning  08:00–14:00
 *   evening  15:00–22:00
 *   fullDay  08:00–22:00
 * A part that has already started is reported as not free.
 *
 * Claim details (block reasons, booking references) are private to the venue
 * manager: they are only included when `includeClaims` is true.
 */

import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { getDb } from "../db/client";
import { slotClaims, type HallSetting } from "../db/schema";
import { getHallsByVenueId } from "./hall-service";

export const DAY_PARTS = [
  { key: "morning", startHour: 8, endHour: 14 },
  { key: "evening", startHour: 15, endHour: 22 },
  { key: "fullDay", startHour: 8, endHour: 22 },
] as const;

export type DayPartKey = (typeof DAY_PARTS)[number]["key"];

export const MAX_CALENDAR_DAYS = 62;

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date in YYYY-MM-DD form. */
export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Adds whole days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in Addis Ababa (YYYY-MM-DD). */
export function todayInAddis(now: Date = new Date()): string {
  return new Date(now.getTime() + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Inclusive day count between two YYYY-MM-DD dates. */
export function dayCount(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

/** A wall-clock hour on a given Addis date, as an absolute instant. */
export function addisTime(dateStr: string, hour: number): Date {
  return new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00+03:00`);
}

export interface CalendarClaim {
  id: string;
  hallId: string;
  type: "block" | "booking";
  startTime: Date;
  endTime: Date;
  reason: string | null;
  bookingId: string | null;
}

export interface CalendarDayHall {
  hallId: string;
  free: Record<DayPartKey, boolean>;
}

export interface CalendarDay {
  date: string;
  halls: CalendarDayHall[];
  claims?: CalendarClaim[];
}

export interface VenueCalendar {
  venueId: string;
  from: string;
  to: string;
  dayParts: { key: DayPartKey; start: string; end: string }[];
  halls: { id: string; name: string; capacity: number; setting: HallSetting }[];
  days: CalendarDay[];
}

/**
 * Builds the calendar. Throws on invalid dates or a range longer than
 * MAX_CALENDAR_DAYS.
 */
export async function getVenueCalendar(
  venueId: string,
  from: string,
  to: string,
  options: { includeClaims: boolean; now?: Date }
): Promise<VenueCalendar> {
  if (!isValidDateString(from) || !isValidDateString(to)) {
    throw new Error("Dates must be in YYYY-MM-DD format");
  }
  const count = dayCount(from, to);
  if (count < 1) {
    throw new Error("'from' must be on or before 'to'");
  }
  if (count > MAX_CALENDAR_DAYS) {
    throw new Error(`Date range cannot be longer than ${MAX_CALENDAR_DAYS} days`);
  }

  const now = options.now ?? new Date();
  const venueHalls = await getHallsByVenueId(venueId);
  const hallIds = venueHalls.map((h) => h.id);

  const rangeStart = addisTime(from, 0);
  const rangeEnd = addisTime(addDays(to, 1), 0);

  const claims =
    hallIds.length === 0
      ? []
      : await getDb()
          .select()
          .from(slotClaims)
          .where(
            and(
              inArray(slotClaims.hallId, hallIds),
              eq(slotClaims.status, "active"),
              lt(slotClaims.startTime, rangeEnd),
              gt(slotClaims.endTime, rangeStart)
            )
          );

  const days: CalendarDay[] = [];

  for (let i = 0; i < count; i++) {
    const date = addDays(from, i);
    const dayStart = addisTime(date, 0);
    const dayEnd = addisTime(addDays(date, 1), 0);

    const hallsForDay: CalendarDayHall[] = venueHalls.map((hall) => {
      const hallClaims = claims.filter((c) => c.hallId === hall.id);
      const free = {} as Record<DayPartKey, boolean>;
      for (const part of DAY_PARTS) {
        const start = addisTime(date, part.startHour);
        const end = addisTime(date, part.endHour);
        const started = now >= start;
        const overlaps = hallClaims.some((c) => c.startTime < end && c.endTime > start);
        free[part.key] = !started && !overlaps;
      }
      return { hallId: hall.id, free };
    });

    const day: CalendarDay = { date, halls: hallsForDay };

    if (options.includeClaims) {
      day.claims = claims
        .filter((c) => c.startTime < dayEnd && c.endTime > dayStart)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        .map((c) => ({
          id: c.id,
          hallId: c.hallId,
          type: c.claimType,
          startTime: c.startTime,
          endTime: c.endTime,
          reason: c.reason,
          bookingId: c.claimType === "booking" ? c.referenceId : null,
        }));
    }

    days.push(day);
  }

  return {
    venueId,
    from,
    to,
    dayParts: DAY_PARTS.map((p) => ({
      key: p.key,
      start: `${String(p.startHour).padStart(2, "0")}:00`,
      end: `${String(p.endHour).padStart(2, "0")}:00`,
    })),
    halls: venueHalls.map((h) => ({
      id: h.id,
      name: h.name,
      capacity: h.capacity,
      setting: h.setting,
    })),
    days,
  };
}
