import type { Booking } from "@/api/types";

/** Upcoming = not cancelled and not over yet (soonest first). Past = the rest (newest first). */
export function splitBookings(list: Booking[], now: number = Date.now()) {
  const isUpcoming = (b: Booking) => b.status !== "cancelled" && new Date(b.endTime).getTime() >= now;
  const upcoming = list.filter(isUpcoming).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const past = list.filter((b) => !isUpcoming(b)).sort((a, b) => b.startTime.localeCompare(a.startTime));
  return { upcoming, past };
}
