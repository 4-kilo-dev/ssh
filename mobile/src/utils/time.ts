/**
 * Date/time helpers that always use Addis Ababa time (UTC+3, no daylight
 * saving), whatever time zone the phone is set to. Matches the backend's
 * venue-calendar-service.
 */
import type { DayPartKey } from "@/api/types";

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

export const DAY_PARTS: { key: DayPartKey; startHour: number; endHour: number }[] = [
  { key: "fullDay", startHour: 8, endHour: 22 },
  { key: "morning", startHour: 8, endHour: 14 },
  { key: "evening", startHour: 15, endHour: 22 },
];

/** Wall-clock parts of an instant, in Addis time. */
export function addisParts(value: Date | string) {
  const t = typeof value === "string" ? new Date(value) : value;
  const a = new Date(t.getTime() + EAT_OFFSET_MS);
  return {
    year: a.getUTCFullYear(),
    month: a.getUTCMonth(), // 0-11
    day: a.getUTCDate(),
    weekday: a.getUTCDay(), // 0 = Sunday
    hour: a.getUTCHours(),
    minute: a.getUTCMinutes(),
  };
}

/** Today's date in Addis (YYYY-MM-DD). */
export function todayAddis(now: Date = new Date()): string {
  return new Date(now.getTime() + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** YYYY-MM-DD of an instant in Addis time. */
export function dateOf(value: Date | string): string {
  const t = typeof value === "string" ? new Date(value) : value;
  return new Date(t.getTime() + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO instant for a wall-clock hour on an Addis date. */
export function addisISO(dateStr: string, hour: number): string {
  return new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00+03:00`).toISOString();
}

/** Parts of a YYYY-MM-DD string without any time-zone shift. */
export function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { year: y, month: m - 1, day: d, weekday };
}

/** First and last date of the month containing dateStr. */
export function monthRange(dateStr: string): { first: string; last: string } {
  const { year, month } = parseDate(dateStr);
  const first = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const last = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  return { first, last };
}

export function addMonths(dateStr: string, months: number): string {
  const { year, month } = parseDate(dateStr);
  return new Date(Date.UTC(year, month + months, 1)).toISOString().slice(0, 10);
}

/** Which day part a booking/claim matches, if it is exactly one of the presets. */
export function dayPartOf(startISO: string, endISO: string): DayPartKey | null {
  const s = addisParts(startISO);
  const e = addisParts(endISO);
  if (dateOf(startISO) !== dateOf(endISO) || s.minute !== 0 || e.minute !== 0) return null;
  const match = DAY_PARTS.find((p) => p.startHour === s.hour && p.endHour === e.hour);
  return match?.key ?? null;
}

export function hhmm(value: Date | string): string {
  const p = addisParts(value);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function isPast(value: Date | string): boolean {
  const t = typeof value === "string" ? new Date(value) : value;
  return t.getTime() < Date.now();
}
