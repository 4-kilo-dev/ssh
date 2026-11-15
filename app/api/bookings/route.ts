import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import {
  createBooking,
  listBookingsByCustomer,
  listBookingsByVenue,
} from "@/lib/services/booking-service";
import { getVenueByManagerId } from "@/lib/services/venue-service";
import { attachBookingDetails } from "@/lib/services/list-details-service";

export async function POST(req: Request) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { venueId, hallIds, startTime, endTime, guestCount, notes } = body;

    if (!venueId || !hallIds || !startTime || !endTime) {
      return NextResponse.json(
        { error: "venueId, hallIds, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for startTime or endTime" },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      venueId,
      customerId: auth.account.id,
      hallIds,
      startTime: startDate,
      endTime: endDate,
      guestCount: guestCount ? Number(guestCount) : 0,
      notes,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (err: any) {
    const msg = err.message || "Failed to create booking";
    if (msg.includes("conflict") || msg.includes("already booked") || msg.includes("exclusion")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    if (auth.account.role === "venue_manager") {
      const venue = await getVenueByManagerId(auth.account.id);
      if (!venue) {
        return NextResponse.json([]);
      }
      const bookings = await listBookingsByVenue(venue.id);
      return NextResponse.json(await attachBookingDetails(bookings, { includeCustomer: true }));
    }

    // Default: customer list
    const bookings = await listBookingsByCustomer(auth.account.id);
    return NextResponse.json(await attachBookingDetails(bookings, { includeCustomer: false }));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list bookings" },
      { status: 500 }
    );
  }
}
