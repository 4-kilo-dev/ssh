/**
 * Phase 8 — Mini-Task 8.2: Core Isolation Invariant Tests
 *
 * Requirements from docs/phases.md:
 * 1. Strict Isolation from the Booking Core:
 *    - Vendor records must NEVER reference or affect venues, halls, bookings, or slot claims.
 *    - Isolation is itself an explicitly asserted and tested property.
 * 2. Swappability:
 *    - The vendor module is completely swappable/pluggable.
 *    - Deleting or altering vendor records has zero side effects on the double-booking
 *      exclusion constraint, availability checks, or booking lifecycles.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { getDb } from "../../lib/db/client";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import { createBooking, cancelBooking } from "../../lib/services/booking-service";
import { checkHallAvailability } from "../../lib/services/availability-service";
import {
  createVendor,
  setVendorBoost,
  deleteVendor,
} from "../../lib/services/vendor-service";
import { sql } from "drizzle-orm";

describe("Phase 8 — Mini-Task 8.2: Strict Vendor Isolation Invariant", () => {
  let adminId: string;
  let managerId: string;
  let customerId: string;
  let vendorOwnerId: string;
  let venueId: string;
  let hallId: string;

  beforeEach(async () => {
    await setupTestDatabase();

    // 1. Accounts
    const admin = await createAccount({
      phone: "+251911000000",
      name: "Isolation Admin",
      role: "super_admin",
    });
    adminId = admin.id;

    const manager = await createAccount({
      phone: "+251911000001",
      name: "Isolation Manager",
      role: "venue_manager",
    });
    managerId = manager.id;

    const customer = await createAccount({
      phone: "+251911000002",
      name: "Isolation Customer",
      role: "user",
    });
    customerId = customer.id;

    const vendorOwner = await createAccount({
      phone: "+251911000003",
      name: "Isolation Vendor Owner",
      role: "vendor",
    });
    vendorOwnerId = vendorOwner.id;

    // 2. Venue & Hall
    const venue = await createVenue({
      managerId,
      name: "Isolation Pavilion",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueId = venue.id;

    const hall = await createHall(managerId, {
      venueId,
      name: "Grand Ballroom",
      capacity: 500,
      setting: "indoor",
    });
    hallId = hall.id;
  });

  it("proves architectural isolation: vendors table has zero foreign keys to venues, halls, bookings, or slot claims", async () => {
    const db = getDb();

    // Query Postgres information_schema for foreign key references involving the vendors table
    const foreignKeysQuery = await db.execute<{
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (tc.table_name = 'vendors' OR ccu.table_name = 'vendors');
    `);

    const fks = foreignKeysQuery.rows;

    // 1. Any FK in vendors should ONLY point to accounts (for owner_id)
    for (const fk of fks) {
      if (fk.table_name === "vendors") {
        expect(fk.foreign_table_name).toBe("accounts");
        expect(fk.column_name).toBe("owner_id");
      }
      // 2. Core booking tables must NEVER point to vendors
      expect(["venues", "halls", "bookings", "booking_halls", "slot_claims"]).not.toContain(
        fk.table_name
      );
    }
  });

  it("proves behavioral isolation: mutating vendors never affects hall availability or double-booking invariant", async () => {
    const start = new Date("2026-12-31T14:00:00Z");
    const end = new Date("2026-12-31T20:00:00Z");

    // Initially available
    const initialAvail = await checkHallAvailability(hallId, start, end);
    expect(initialAvail.available).toBe(true);

    // Create, boost, and modify multiple vendors
    const v1 = await createVendor({
      ownerId: vendorOwnerId,
      name: "Vendor Alpha",
      category: "Catering",
    });
    await setVendorBoost({
      vendorId: v1.id,
      callerId: vendorOwnerId,
      boostStatus: "boosted",
      boostScore: 100,
    });

    // Hall availability MUST remain unchanged
    const midAvail = await checkHallAvailability(hallId, start, end);
    expect(midAvail.available).toBe(true);

    // Book the hall
    const booking = await createBooking({
      venueId,
      customerId,
      hallIds: [hallId],
      startTime: start,
      endTime: end,
      guestCount: 250,
    });
    expect(booking.id).toBeDefined();

    // Now hall is booked
    const bookedAvail = await checkHallAvailability(hallId, start, end);
    expect(bookedAvail.available).toBe(false);

    // Delete vendor completely (swappability)
    await deleteVendor(v1.id, vendorOwnerId);

    // Booking state and slot claims MUST remain intact and unaffected
    const afterVendorDeleteAvail = await checkHallAvailability(hallId, start, end);
    expect(afterVendorDeleteAvail.available).toBe(false);

    // Cancel booking releases slot claims independently
    await cancelBooking({
      bookingId: booking.id,
      callerId: customerId,
    });

    const finalAvail = await checkHallAvailability(hallId, start, end);
    expect(finalAvail.available).toBe(true);
  });
});
