/**
 * Booking Service — Phase 5
 *
 * Implements the core booking lifecycle & multi-hall atomic reservation:
 * 1. State machine:
 *    - `requested`: initial state submitted by customer.
 *    - `confirmed`: manager re-verifies and confirms (after off-platform deposit).
 *    - `cancelled`: cancelled by customer or manager; atomically releases all slot claims.
 * 2. Multi-hall Atomic Rule (All-or-Nothing):
 *    - A booking covers 1..N halls of the same venue.
 *    - Handled in a single Postgres transaction: if any hall suffers an exclusion violation,
 *      the entire transaction rolls back cleanly with zero claims created.
 * 3. Strict ownership boundaries:
 *    - Only the owning manager can confirm bookings for their venue.
 *    - Customer who created the booking or the venue's manager can cancel.
 */

import { eq, inArray, desc } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  bookings,
  bookingHalls,
  slotClaims,
  halls,
  venues,
  accounts,
  type Booking,
  type BookingStatus,
  type BookingHall,
} from "../db/schema";
import { getVenueById } from "./venue-service";
import { logAuditEvent } from "./audit-service";

export interface BookingWithHalls extends Booking {
  halls: BookingHall[];
}

export interface CreateBookingInput {
  venueId: string;
  customerId: string;
  hallIds: string[];
  startTime: Date;
  endTime: Date;
  guestCount?: number;
  notes?: string;
}

export interface ConfirmBookingInput {
  bookingId: string;
  callerId: string;
}

export interface CancelBookingInput {
  bookingId: string;
  callerId: string;
  reason?: string;
}

/**
 * Creates a new booking in 'requested' status across 1..N halls atomically.
 */
export async function createBooking(input: CreateBookingInput): Promise<BookingWithHalls> {
  if (input.startTime >= input.endTime) {
    throw new Error("Start time must be strictly before end time");
  }

  if (!input.hallIds || input.hallIds.length === 0) {
    throw new Error("Booking must include at least one hall");
  }

  const db = getDb();

  // Validate customer existence
  const [customer] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.customerId))
    .limit(1);

  if (!customer) {
    throw new Error("Customer account not found");
  }

  // Validate venue existence
  const venue = await getVenueById(input.venueId);
  if (!venue) {
    throw new Error("Venue not found");
  }

  // Validate all halls belong to this venue
  const selectedHalls = await db
    .select()
    .from(halls)
    .where(inArray(halls.id, input.hallIds));

  if (selectedHalls.length !== input.hallIds.length) {
    throw new Error("One or more selected halls do not exist");
  }

  for (const h of selectedHalls) {
    if (h.venueId !== input.venueId) {
      throw new Error(`Hall '${h.name}' does not belong to venue '${venue.name}'`);
    }
  }

  // Atomic multi-hall booking in transaction
  const created = await db.transaction(async (tx) => {
    // 1. Insert parent booking record
    const [booking] = await tx
      .insert(bookings)
      .values({
        venueId: input.venueId,
        customerId: input.customerId,
        status: "requested",
        startTime: input.startTime,
        endTime: input.endTime,
        guestCount: input.guestCount ?? 0,
        notes: input.notes?.trim() ?? null,
      })
      .returning();

    const createdHalls: BookingHall[] = [];

    // 2. Insert slot claim for each hall (exclusion constraint protects against overlaps)
    for (const hallId of input.hallIds) {
      try {
        const [claim] = await tx
          .insert(slotClaims)
          .values({
            hallId,
            startTime: input.startTime,
            endTime: input.endTime,
            claimType: "booking",
            status: "active",
            reason: input.notes?.trim() ?? `Booking ${booking.id}`,
            createdById: input.customerId,
            referenceId: booking.id,
          })
          .returning();

        const [bHall] = await tx
          .insert(bookingHalls)
          .values({
            bookingId: booking.id,
            hallId,
            slotClaimId: claim.id,
          })
          .returning();

        createdHalls.push(bHall);
      } catch (err: any) {
        if (err.code === "23P01" || err.message?.includes("slot_claims_no_overlap")) {
          throw new Error(
            `Time slot conflict: One or more selected halls are already booked or held during this time window`
          );
        }
        throw err;
      }
    }

    return {
      ...booking,
      halls: createdHalls,
    };
  });

  await logAuditEvent({
    actorId: input.customerId,
    action: "booking.created",
    targetType: "booking",
    targetId: created.id,
    metadata: {
      venueId: input.venueId,
      hallIds: input.hallIds,
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
      guestCount: input.guestCount ?? 0,
      notes: input.notes?.trim() ?? null,
    },
  });

  return created;
}

/**
 * Retrieves a booking by its ID, including its associated halls.
 */
export async function getBookingById(bookingId: string): Promise<BookingWithHalls | null> {
  const db = getDb();

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    return null;
  }

  const attachedHalls = await db
    .select()
    .from(bookingHalls)
    .where(eq(bookingHalls.bookingId, bookingId));

  return {
    ...booking,
    halls: attachedHalls,
  };
}

/**
 * Lists all bookings for a customer.
 */
export async function listBookingsByCustomer(customerId: string): Promise<BookingWithHalls[]> {
  const db = getDb();

  const customerBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt));

  const result: BookingWithHalls[] = [];
  for (const b of customerBookings) {
    const attachedHalls = await db
      .select()
      .from(bookingHalls)
      .where(eq(bookingHalls.bookingId, b.id));
    result.push({
      ...b,
      halls: attachedHalls,
    });
  }

  return result;
}

/**
 * Lists all bookings for a venue.
 */
export async function listBookingsByVenue(venueId: string): Promise<BookingWithHalls[]> {
  const db = getDb();

  const venueBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.venueId, venueId))
    .orderBy(desc(bookings.createdAt));

  const result: BookingWithHalls[] = [];
  for (const b of venueBookings) {
    const attachedHalls = await db
      .select()
      .from(bookingHalls)
      .where(eq(bookingHalls.bookingId, b.id));
    result.push({
      ...b,
      halls: attachedHalls,
    });
  }

  return result;
}

/**
 * Manager re-verifies and confirms a requested booking.
 * Legal transition: 'requested' -> 'confirmed'.
 */
export async function confirmBooking(input: ConfirmBookingInput): Promise<BookingWithHalls> {
  const booking = await getBookingById(input.bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status === "cancelled") {
    throw new Error("Cannot confirm a cancelled booking");
  }

  const venue = await getVenueById(booking.venueId);
  if (!venue) {
    throw new Error("Venue not found");
  }

  if (venue.managerId !== input.callerId) {
    throw new Error("Not authorized: Only the owner manager of this venue can confirm bookings");
  }

  if (booking.status === "confirmed") {
    return booking;
  }

  const db = getDb();
  const [updated] = await db
    .update(bookings)
    .set({
      status: "confirmed",
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, input.bookingId))
    .returning();

  await logAuditEvent({
    actorId: input.callerId,
    action: "booking.confirmed",
    targetType: "booking",
    targetId: input.bookingId,
    metadata: {
      venueId: booking.venueId,
    },
  });

  return {
    ...updated,
    halls: booking.halls,
  };
}

/**
 * Cancels a booking and atomically releases all associated slot claims.
 * Allowed callers: the booking's customer OR the owning venue's manager.
 */
export async function cancelBooking(input: CancelBookingInput): Promise<BookingWithHalls> {
  const booking = await getBookingById(input.bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status === "cancelled") {
    throw new Error("Booking is already cancelled");
  }

  const venue = await getVenueById(booking.venueId);
  if (!venue) {
    throw new Error("Venue not found");
  }

  const isCustomer = booking.customerId === input.callerId;
  const isManager = venue.managerId === input.callerId;

  if (!isCustomer && !isManager) {
    throw new Error("Not authorized: You cannot cancel this booking");
  }

  const db = getDb();

  const cancelled = await db.transaction(async (tx) => {
    // 1. Update booking status to 'cancelled'
    const [updated] = await tx
      .update(bookings)
      .set({
        status: "cancelled",
        cancellationReason: input.reason?.trim() ?? null,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, input.bookingId))
      .returning();

    // 2. Release all slot claims attached to this booking
    const attachedHalls = await tx
      .select()
      .from(bookingHalls)
      .where(eq(bookingHalls.bookingId, input.bookingId));

    for (const bh of attachedHalls) {
      await tx
        .update(slotClaims)
        .set({
          status: "released",
          updatedAt: new Date(),
        })
        .where(eq(slotClaims.id, bh.slotClaimId));
    }

    return {
      ...updated,
      halls: attachedHalls,
    };
  });

  await logAuditEvent({
    actorId: input.callerId,
    action: "booking.cancelled",
    targetType: "booking",
    targetId: input.bookingId,
    metadata: {
      reason: input.reason?.trim() ?? null,
      venueId: booking.venueId,
    },
  });

  return cancelled;
}
