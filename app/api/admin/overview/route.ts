import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { getDb } from "@/lib/db/client";
import {
  venues,
  halls,
  bookings,
  supportTickets,
  auditLogs,
} from "@/lib/db/schema";
import { count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.account.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  const db = getDb();

  const [[venuesRow], [hallsRow], [bookingsRow], [ticketsRow], [auditLogsRow]] = await Promise.all([
    db.select({ count: count() }).from(venues),
    db.select({ count: count() }).from(halls),
    db.select({ count: count() }).from(bookings),
    db.select({ count: count() }).from(supportTickets),
    db.select({ count: count() }).from(auditLogs),
  ]);

  const bookingStatusRows = await db
    .select({
      status: bookings.status,
      count: count(),
    })
    .from(bookings)
    .groupBy(bookings.status);

  const bookingsByStatus: Record<string, number> = {
    requested: 0,
    confirmed: 0,
    cancelled: 0,
  };
  for (const row of bookingStatusRows) {
    bookingsByStatus[row.status] = Number(row.count);
  }

  const ticketStatusRows = await db
    .select({
      status: supportTickets.status,
      count: count(),
    })
    .from(supportTickets)
    .groupBy(supportTickets.status);

  const ticketsByStatus: Record<string, number> = {
    open: 0,
    in_progress: 0,
    resolved: 0,
  };
  for (const row of ticketStatusRows) {
    ticketsByStatus[row.status] = Number(row.count);
  }

  return NextResponse.json({
    overview: {
      venuesCount: Number(venuesRow?.count ?? 0),
      hallsCount: Number(hallsRow?.count ?? 0),
      bookingsCount: Number(bookingsRow?.count ?? 0),
      bookingsByStatus,
      ticketsCount: Number(ticketsRow?.count ?? 0),
      ticketsByStatus,
      auditLogsCount: Number(auditLogsRow?.count ?? 0),
    },
  });
}
