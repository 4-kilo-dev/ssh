import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { getBookingById } from "@/lib/services/booking-service";
import { getVenueById } from "@/lib/services/venue-service";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await props.params;
  const booking = await getBookingById(id);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Check authorization: customer or venue manager
  const venue = await getVenueById(booking.venueId);
  const isCustomer = booking.customerId === auth.account.id;
  const isManager = venue?.managerId === auth.account.id;
  const isAdmin = auth.account.role === "super_admin";

  if (!isCustomer && !isManager && !isAdmin) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view this booking" },
      { status: 403 }
    );
  }

  return NextResponse.json(booking);
}
