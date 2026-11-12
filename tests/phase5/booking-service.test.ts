/**
 * Phase 5 — Mini-Task 5.1: Booking Lifecycle & Multi-Hall Atomic Reservation Tests
 *
 * Requirements from docs/phases.md and docs/assumptions-and-schema.md:
 * 1. Booking State Machine:
 *    - `requested`: Initial state created by a customer covering one or more halls.
 *    - `confirmed`: Venue manager re-verifies the slot and marks confirmed.
 *    - `cancelled`: Cancelled by customer or manager; releases all slot claims.
 *    - Illegal transitions: Cannot confirm a cancelled booking; cannot cancel an already cancelled booking.
 * 2. Multi-hall Atomic Rule (All-or-Nothing):
 *    - A booking can cover 1..N halls of the same venue.
 *    - If ANY hall in the set is unavailable or overlaps with an active claim/block,
 *      the entire booking fails atomically — zero claims are created, and no booking is saved.
 * 3. Validation & Invariants:
 *    - `startTime` must be strictly before `endTime`.
 *    - Halls array must not be empty.
 *    - All halls must belong to the venue being booked.
 * 4. Authorization & Boundaries:
 *    - Only the manager of the venue can confirm bookings for that venue.
 *    - Customer can cancel their own booking; manager of the venue can also cancel.
 *    - Foreign managers and unrelated users cannot confirm or cancel.
 * 5. Releasing Claims:
 *    - When a booking is cancelled, its associated slot claims must transition to `released`,
 *      immediately freeing up availability for all included halls.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import { createSlotBlock } from "../../lib/services/slot-block-service";
import { checkHallAvailability } from "../../lib/services/availability-service";
import {
  createBooking,
  getBookingById,
  listBookingsByCustomer,
  listBookingsByVenue,
  confirmBooking,
  cancelBooking,
} from "../../lib/services/booking-service";

describe("Phase 5 — Mini-Task 5.1: Booking Lifecycle & Multi-Hall Atomic Reservation", () => {
  let customerId: string;
  let otherCustomerId: string;
  let managerAId: string;
  let managerBId: string;
  let venueAId: string;
  let hallA1Id: string;
  let hallA2Id: string;
  let hallA3Id: string;

  beforeEach(async () => {
    // Fresh test database with migrations per test run
    await setupTestDatabase();

    // 1. Create customer accounts
    const customer = await createAccount({
      phone: "+251915000001",
      name: "Customer Dawit",
      role: "user",
    });
    customerId = customer.id;

    const otherCustomer = await createAccount({
      phone: "+251915000002",
      name: "Customer Sara",
      role: "user",
    });
    otherCustomerId = otherCustomer.id;

    // 2. Create venue managers
    const managerA = await createAccount({
      phone: "+251915000003",
      name: "Manager Alice",
      role: "venue_manager",
    });
    managerAId = managerA.id;

    const managerB = await createAccount({
      phone: "+251915000004",
      name: "Manager Bob",
      role: "venue_manager",
    });
    managerBId = managerB.id;

    // 3. Create Venue A and 3 distinct halls
    const venueA = await createVenue({
      managerId: managerAId,
      name: "Grand Palace Hotel",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueAId = venueA.id;

    const hall1 = await createHall(managerAId, {
      venueId: venueAId,
      name: "Ballroom East",
      capacity: 300,
      setting: "indoor",
    });
    hallA1Id = hall1.id;

    const hall2 = await createHall(managerAId, {
      venueId: venueAId,
      name: "Ballroom West",
      capacity: 300,
      setting: "indoor",
    });
    hallA2Id = hall2.id;

    const hall3 = await createHall(managerAId, {
      venueId: venueAId,
      name: "Garden Terrace",
      capacity: 150,
      setting: "uncovered-outdoor",
    });
    hallA3Id = hall3.id;
  });

  it("proves a customer can create a 'requested' booking for a single hall", async () => {
    // Test creates a requested booking for hall 1: 14:00 to 18:00
    const start = new Date("2026-12-01T14:00:00Z");
    const end = new Date("2026-12-01T18:00:00Z");

    const booking = await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id],
      startTime: start,
      endTime: end,
      guestCount: 200,
      notes: "Wedding reception with catering",
    });

    expect(booking).toBeDefined();
    expect(booking.id).toBeDefined();
    expect(booking.venueId).toBe(venueAId);
    expect(booking.customerId).toBe(customerId);
    expect(booking.status).toBe("requested");
    expect(booking.guestCount).toBe(200);
    expect(booking.notes).toBe("Wedding reception with catering");
    expect(booking.halls).toHaveLength(1);
    expect(booking.halls[0].hallId).toBe(hallA1Id);

    // Verify derived availability: hall 1 should now be UNAVAILABLE during that window
    const result = await checkHallAvailability(hallA1Id, start, end);
    expect(result.available).toBe(false);

    // Other halls at Venue A should remain AVAILABLE
    const hall2Result = await checkHallAvailability(hallA2Id, start, end);
    expect(hall2Result.available).toBe(true);
  });

  it("proves a customer can atomically book multiple halls of the same venue", async () => {
    // Multi-hall event: wedding needing Ballroom East + Ballroom West
    const start = new Date("2026-12-02T10:00:00Z");
    const end = new Date("2026-12-02T20:00:00Z");

    const booking = await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id, hallA2Id],
      startTime: start,
      endTime: end,
      guestCount: 500,
      notes: "Full banquet across east and west wings",
    });

    expect(booking.status).toBe("requested");
    expect(booking.halls).toHaveLength(2);
    const bookedHallIds = booking.halls.map((h) => h.hallId);
    expect(bookedHallIds).toContain(hallA1Id);
    expect(bookedHallIds).toContain(hallA2Id);

    // Both halls must now be UNAVAILABLE
    expect((await checkHallAvailability(hallA1Id, start, end)).available).toBe(false);
    expect((await checkHallAvailability(hallA2Id, start, end)).available).toBe(false);

    // Unbooked hall 3 must remain free
    expect((await checkHallAvailability(hallA3Id, start, end)).available).toBe(true);
  });

  it("proves multi-hall atomic rule: if 1 of 3 halls is already blocked, entire booking fails with zero claims created", async () => {
    const start = new Date("2026-12-03T12:00:00Z");
    const end = new Date("2026-12-03T18:00:00Z");

    // Manager blocks hall 2 off-platform
    await createSlotBlock({
      hallId: hallA2Id,
      startTime: start,
      endTime: end,
      reason: "Maintenance / painting",
      managerId: managerAId,
    });

    // Customer attempts to book halls [1, 2, 3] simultaneously
    await expect(
      createBooking({
        venueId: venueAId,
        customerId,
        hallIds: [hallA1Id, hallA2Id, hallA3Id],
        startTime: start,
        endTime: end,
        guestCount: 600,
      })
    ).rejects.toThrow(/overlap|conflict|unavailable/i);

    // CRITICAL ATOMICITY CHECK:
    // Hall 1 and Hall 3 must NOT have partial leftover claims!
    expect((await checkHallAvailability(hallA1Id, start, end)).available).toBe(true);
    expect((await checkHallAvailability(hallA3Id, start, end)).available).toBe(true);

    // Customer should have no booking records created
    const customerBookings = await listBookingsByCustomer(customerId);
    expect(customerBookings).toHaveLength(0);
  });

  it("proves validation rejects invalid time range, empty halls, or halls from foreign venues", async () => {
    const start = new Date("2026-12-04T16:00:00Z");
    const end = new Date("2026-12-04T12:00:00Z"); // Invalid: end before start

    // 1. Invalid time range
    await expect(
      createBooking({
        venueId: venueAId,
        customerId,
        hallIds: [hallA1Id],
        startTime: start,
        endTime: end,
      })
    ).rejects.toThrow(/start.*end/i);

    // 2. Empty halls array
    await expect(
      createBooking({
        venueId: venueAId,
        customerId,
        hallIds: [],
        startTime: new Date("2026-12-04T12:00:00Z"),
        endTime: new Date("2026-12-04T16:00:00Z"),
      })
    ).rejects.toThrow(/at least one hall/i);

    // 3. Hall from another venue
    const venueB = await createVenue({
      managerId: managerBId,
      name: "Bob Convention Center",
      area: "Kazanchis",
      type: "Convention Center",
    });
    const hallB = await createHall(managerBId, {
      venueId: venueB.id,
      name: "Main Auditorium",
      capacity: 800,
      setting: "indoor",
    });

    await expect(
      createBooking({
        venueId: venueAId,
        customerId,
        hallIds: [hallA1Id, hallB.id], // hallB belongs to Venue B, not Venue A!
        startTime: new Date("2026-12-04T12:00:00Z"),
        endTime: new Date("2026-12-04T16:00:00Z"),
      })
    ).rejects.toThrow(/belong to venue/i);
  });

  it("proves the venue manager can re-verify and confirm a 'requested' booking", async () => {
    const start = new Date("2026-12-05T14:00:00Z");
    const end = new Date("2026-12-05T22:00:00Z");

    const booking = await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id],
      startTime: start,
      endTime: end,
    });
    expect(booking.status).toBe("requested");

    // Manager A confirms booking after deposit/re-verification
    const confirmed = await confirmBooking({
      bookingId: booking.id,
      callerId: managerAId,
    });

    expect(confirmed.status).toBe("confirmed");

    // Slot remains claimed and unavailable
    expect((await checkHallAvailability(hallA1Id, start, end)).available).toBe(false);
  });

  it("proves foreign manager cannot confirm another venue's booking (ownership boundary)", async () => {
    const start = new Date("2026-12-06T10:00:00Z");
    const end = new Date("2026-12-06T14:00:00Z");

    const booking = await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id],
      startTime: start,
      endTime: end,
    });

    // Manager B (does not own Venue A) attempts to confirm
    await expect(
      confirmBooking({
        bookingId: booking.id,
        callerId: managerBId,
      })
    ).rejects.toThrow(/not authorized|forbidden|owner/i);

    // Customer also cannot self-confirm
    await expect(
      confirmBooking({
        bookingId: booking.id,
        callerId: customerId,
      })
    ).rejects.toThrow(/not authorized|forbidden|owner/i);

    // State remains 'requested'
    const current = await getBookingById(booking.id);
    expect(current?.status).toBe("requested");
  });

  it("proves cancelling a booking transitions status to 'cancelled' and frees all hall slots", async () => {
    const start = new Date("2026-12-07T09:00:00Z");
    const end = new Date("2026-12-07T17:00:00Z");

    const booking = await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id, hallA2Id],
      startTime: start,
      endTime: end,
    });

    // Before cancellation: both halls are held
    expect((await checkHallAvailability(hallA1Id, start, end)).available).toBe(false);
    expect((await checkHallAvailability(hallA2Id, start, end)).available).toBe(false);

    // Customer cancels their booking
    const cancelled = await cancelBooking({
      bookingId: booking.id,
      callerId: customerId,
      reason: "Event postponed indefinitely",
    });

    expect(cancelled.status).toBe("cancelled");

    // CRITICAL: Slot claims are released, so halls are immediately AVAILABLE again!
    expect((await checkHallAvailability(hallA1Id, start, end)).available).toBe(true);
    expect((await checkHallAvailability(hallA2Id, start, end)).available).toBe(true);
  });

  it("proves the venue manager can also cancel a booking", async () => {
    const start = new Date("2026-12-08T10:00:00Z");
    const end = new Date("2026-12-08T14:00:00Z");

    const booking = await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id],
      startTime: start,
      endTime: end,
    });

    // Manager A cancels the booking (e.g. deposit not received)
    const cancelled = await cancelBooking({
      bookingId: booking.id,
      callerId: managerAId,
      reason: "Deposit window expired",
    });

    expect(cancelled.status).toBe("cancelled");
    expect((await checkHallAvailability(hallA1Id, start, end)).available).toBe(true);
  });

  it("proves unrelated customer or foreign manager cannot cancel a booking", async () => {
    const start = new Date("2026-12-09T10:00:00Z");
    const end = new Date("2026-12-09T14:00:00Z");

    const booking = await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id],
      startTime: start,
      endTime: end,
    });

    // Another customer tries to cancel
    await expect(
      cancelBooking({
        bookingId: booking.id,
        callerId: otherCustomerId,
      })
    ).rejects.toThrow(/not authorized|forbidden/i);

    // Foreign manager tries to cancel
    await expect(
      cancelBooking({
        bookingId: booking.id,
        callerId: managerBId,
      })
    ).rejects.toThrow(/not authorized|forbidden/i);

    const current = await getBookingById(booking.id);
    expect(current?.status).toBe("requested");
  });

  it("proves state machine rejects illegal transitions: cannot confirm or re-cancel a cancelled booking", async () => {
    const start = new Date("2026-12-10T11:00:00Z");
    const end = new Date("2026-12-10T15:00:00Z");

    const booking = await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id],
      startTime: start,
      endTime: end,
    });

    // Cancel the booking
    await cancelBooking({
      bookingId: booking.id,
      callerId: customerId,
    });

    // 1. Illegal transition: confirmed from cancelled
    await expect(
      confirmBooking({
        bookingId: booking.id,
        callerId: managerAId,
      })
    ).rejects.toThrow(/cannot confirm.*cancelled/i);

    // 2. Illegal transition: re-cancelling already cancelled booking
    await expect(
      cancelBooking({
        bookingId: booking.id,
        callerId: customerId,
      })
    ).rejects.toThrow(/already cancelled/i);
  });

  it("proves listBookingsByCustomer and listBookingsByVenue return accurate scoped collections", async () => {
    const start1 = new Date("2026-12-11T10:00:00Z");
    const end1 = new Date("2026-12-11T14:00:00Z");
    const start2 = new Date("2026-12-12T10:00:00Z");
    const end2 = new Date("2026-12-12T14:00:00Z");

    await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA1Id],
      startTime: start1,
      endTime: end1,
      notes: "First booking",
    });

    await createBooking({
      venueId: venueAId,
      customerId,
      hallIds: [hallA2Id],
      startTime: start2,
      endTime: end2,
      notes: "Second booking",
    });

    const customerBookings = await listBookingsByCustomer(customerId);
    expect(customerBookings).toHaveLength(2);

    const venueBookings = await listBookingsByVenue(venueAId);
    expect(venueBookings).toHaveLength(2);

    // Other customer has none
    const otherBookings = await listBookingsByCustomer(otherCustomerId);
    expect(otherBookings).toHaveLength(0);
  });
});
