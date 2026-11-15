import type { CalendarDay, DayPartKey, VenueCalendar } from "@/api/types";
import type { StripDay } from "@/ui/DateStrip";

/** True when at least one hall has at least one free part on this day. */
export function dayHasFreeTime(day: CalendarDay): boolean {
  return day.halls.some((h) => h.free.morning || h.free.evening || h.free.fullDay);
}

export function stripDays(calendar: VenueCalendar | undefined): StripDay[] {
  return (calendar?.days ?? []).map((d) => ({ date: d.date, free: dayHasFreeTime(d) }));
}

export function firstFreeDate(calendar: VenueCalendar | undefined): string | null {
  return calendar?.days.find(dayHasFreeTime)?.date ?? null;
}

export function findDay(calendar: VenueCalendar | undefined, date: string | null | undefined) {
  if (!calendar || !date) return undefined;
  return calendar.days.find((d) => d.date === date);
}

/** Hall ids free for a part of a day. */
export function freeHallIds(day: CalendarDay | undefined, part: DayPartKey): string[] {
  if (!day) return [];
  return day.halls.filter((h) => h.free[part]).map((h) => h.hallId);
}

/**
 * Best hall for the guest count: the smallest free hall that fits everyone;
 * if none fits, the largest free hall (the screen then shows a warning).
 */
export function bestHall<H extends { id: string; capacity: number }>(
  halls: H[],
  freeIds: string[],
  guests: number
): H | null {
  const free = halls.filter((h) => freeIds.includes(h.id));
  if (free.length === 0) return null;
  const fitting = free.filter((h) => h.capacity >= guests).sort((a, b) => a.capacity - b.capacity);
  if (fitting.length > 0) return fitting[0];
  return [...free].sort((a, b) => b.capacity - a.capacity)[0];
}
