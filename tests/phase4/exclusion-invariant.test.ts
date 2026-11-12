/**
 * Phase 4 — Mini-Task 4.1: The Double-Booking Invariant & Postgres GIST Exclusion Tests
 *
 * This test suite exhaustively proves the platform's core trust guarantee:
 * "For any single hall, no two active time claims may overlap in time."
 *
 * We test the database-level Postgres GIST exclusion constraint:
 * EXCLUDE USING gist (hall_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&) WHERE (status = 'active')
 *
 * Scenarios tested exhaustively:
 * 1. Exact identical time window overlap -> REJECTED
 * 2. Partial overlap: Claim B starts before Claim A, ends inside Claim A -> REJECTED
 * 3. Partial overlap: Claim B starts inside Claim A, ends after Claim A -> REJECTED
 * 4. Complete enclosure: Claim B is fully inside Claim A -> REJECTED
 * 5. Complete envelope: Claim B wraps around Claim A -> REJECTED
 * 6. Adjacent touching boundary: Claim A [10:00, 14:00) and Claim B [14:00, 18:00) -> SUCCEEDS (half-open range [))
 * 7. Hall isolation: Identical time range on two DIFFERENT halls -> SUCCEEDS
 * 8. Cancelled / released claims: Once Claim A is marked 'released', an overlapping Claim B -> SUCCEEDS
 * 9. Concurrent simultaneous writes: Two transactions racing to write overlapping claims -> exactly one succeeds, one rejected
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import {
  createSlotClaim,
  releaseSlotClaim,
  getSlotClaimById,
} from "../../lib/services/slot-claim-service";

describe("Phase 4 — Mini-Task 4.1: Exhaustive Double-Booking Invariant & GIST Exclusion", () => {
  let managerId: string;
  let hall1Id: string;
  let hall2Id: string;

  beforeEach(async () => {
    // Reset test database with clean schema, btree_gist extension, and migrations
    await setupTestDatabase();

    const manager = await createAccount({
      phone: "+251914000001",
      name: "Crown Jewel Manager",
      role: "venue_manager",
    });
    managerId = manager.id;

    const venue = await createVenue({
      managerId,
      name: "Addis Imperial Palace",
      area: "Bole",
      type: "Hotel ballroom",
    });

    const hall1 = await createHall(managerId, {
      venueId: venue.id,
      name: "Grand Ballroom A",
      capacity: 500,
      setting: "indoor",
    });
    hall1Id = hall1.id;

    const hall2 = await createHall(managerId, {
      venueId: venue.id,
      name: "Cedar Pavilion B",
      capacity: 250,
      setting: "covered-outdoor",
    });
    hall2Id = hall2.id;
  });

  it("proves identical time window collision on the same hall is rejected by the database", async () => {
    // Explanation: Claim A holds [10:00, 16:00). Claim B tries to claim the exact same [10:00, 16:00).
    // The database must atomically reject Claim B with an exclusion constraint violation.
    const start = new Date("2026-12-05T10:00:00+03:00");
    const end = new Date("2026-12-05T16:00:00+03:00");

    await createSlotClaim({
      hallId: hall1Id,
      startTime: start,
      endTime: end,
      claimType: "block",
      reason: "Off-platform VIP reception",
      createdById: managerId,
    });

    await expect(
      createSlotClaim({
        hallId: hall1Id,
        startTime: start,
        endTime: end,
        claimType: "block",
        reason: "Colliding booking attempt",
        createdById: managerId,
      })
    ).rejects.toThrow(/exclusion constraint|overlapping|double-booking/i);
  });

  it("proves partial overlap (starts before, ends inside) is rejected", async () => {
    // Explanation: Claim A holds [12:00, 18:00).
    // Claim B tries [10:00, 14:00) — overlaps Claim A between 12:00 and 14:00.
    // Must be rejected.
    await createSlotClaim({
      hallId: hall1Id,
      startTime: new Date("2026-12-05T12:00:00+03:00"),
      endTime: new Date("2026-12-05T18:00:00+03:00"),
      claimType: "block",
      reason: "Afternoon Wedding",
      createdById: managerId,
    });

    await expect(
      createSlotClaim({
        hallId: hall1Id,
        startTime: new Date("2026-12-05T10:00:00+03:00"),
        endTime: new Date("2026-12-05T14:00:00+03:00"),
        claimType: "block",
        reason: "Colliding setup time",
        createdById: managerId,
      })
    ).rejects.toThrow(/exclusion constraint|overlapping|double-booking/i);
  });

  it("proves partial overlap (starts inside, ends after) is rejected", async () => {
    // Explanation: Claim A holds [10:00, 16:00).
    // Claim B tries [14:00, 20:00) — overlaps Claim A between 14:00 and 16:00.
    // Must be rejected.
    await createSlotClaim({
      hallId: hall1Id,
      startTime: new Date("2026-12-05T10:00:00+03:00"),
      endTime: new Date("2026-12-05T16:00:00+03:00"),
      claimType: "block",
      reason: "Morning / Afternoon Session",
      createdById: managerId,
    });

    await expect(
      createSlotClaim({
        hallId: hall1Id,
        startTime: new Date("2026-12-05T14:00:00+03:00"),
        endTime: new Date("2026-12-05T20:00:00+03:00"),
        claimType: "block",
        reason: "Evening Collision",
        createdById: managerId,
      })
    ).rejects.toThrow(/exclusion constraint|overlapping|double-booking/i);
  });

  it("proves complete enclosure (Claim B is completely inside Claim A) is rejected", async () => {
    // Explanation: Claim A holds all-day [08:00, 22:00).
    // Claim B tries a 2-hour slot [13:00, 15:00) inside Claim A.
    // Must be rejected.
    await createSlotClaim({
      hallId: hall1Id,
      startTime: new Date("2026-12-05T08:00:00+03:00"),
      endTime: new Date("2026-12-05T22:00:00+03:00"),
      claimType: "block",
      reason: "All Day Conference",
      createdById: managerId,
    });

    await expect(
      createSlotClaim({
        hallId: hall1Id,
        startTime: new Date("2026-12-05T13:00:00+03:00"),
        endTime: new Date("2026-12-05T15:00:00+03:00"),
        claimType: "block",
        reason: "Short meeting collision",
        createdById: managerId,
      })
    ).rejects.toThrow(/exclusion constraint|overlapping|double-booking/i);
  });

  it("proves complete envelope (Claim B envelopes Claim A entirely) is rejected", async () => {
    // Explanation: Claim A holds [12:00, 14:00).
    // Claim B tries to claim [09:00, 20:00), wrapping around Claim A.
    // Must be rejected.
    await createSlotClaim({
      hallId: hall1Id,
      startTime: new Date("2026-12-05T12:00:00+03:00"),
      endTime: new Date("2026-12-05T14:00:00+03:00"),
      claimType: "block",
      reason: "Lunch Gathering",
      createdById: managerId,
    });

    await expect(
      createSlotClaim({
        hallId: hall1Id,
        startTime: new Date("2026-12-05T09:00:00+03:00"),
        endTime: new Date("2026-12-05T20:00:00+03:00"),
        claimType: "block",
        reason: "Full day envelope attempt",
        createdById: managerId,
      })
    ).rejects.toThrow(/exclusion constraint|overlapping|double-booking/i);
  });

  it("proves adjacent-but-not-overlapping claims on the exact boundary are allowed", async () => {
    // Explanation: Under half-open range intervals [start, end), if Claim A ends at 14:00
    // and Claim B starts at 14:00, they touch at the boundary point but DO NOT overlap.
    // Example: A morning booking 09:00-14:00 and an evening booking 14:00-20:00 can both occur on the same day.
    const claim1 = await createSlotClaim({
      hallId: hall1Id,
      startTime: new Date("2026-12-05T09:00:00+03:00"),
      endTime: new Date("2026-12-05T14:00:00+03:00"),
      claimType: "block",
      reason: "Morning Seminar",
      createdById: managerId,
    });

    const claim2 = await createSlotClaim({
      hallId: hall1Id,
      startTime: new Date("2026-12-05T14:00:00+03:00"),
      endTime: new Date("2026-12-05T20:00:00+03:00"),
      claimType: "block",
      reason: "Evening Banquet",
      createdById: managerId,
    });

    expect(claim1.id).toBeDefined();
    expect(claim2.id).toBeDefined();
    expect(claim1.id).not.toBe(claim2.id);
  });

  it("proves identical time range on DIFFERENT halls is allowed (hall isolation)", async () => {
    // Explanation: The exclusion constraint is scoped per hall (`hall_id WITH =`).
    // Two different halls in the same venue (or different venues) can legitimately have events at the exact same time.
    const timeStart = new Date("2026-12-05T10:00:00+03:00");
    const timeEnd = new Date("2026-12-05T18:00:00+03:00");

    const claimHall1 = await createSlotClaim({
      hallId: hall1Id,
      startTime: timeStart,
      endTime: timeEnd,
      claimType: "block",
      reason: "Ballroom Event",
      createdById: managerId,
    });

    const claimHall2 = await createSlotClaim({
      hallId: hall2Id,
      startTime: timeStart,
      endTime: timeEnd,
      claimType: "block",
      reason: "Pavilion Event",
      createdById: managerId,
    });

    expect(claimHall1.id).toBeDefined();
    expect(claimHall2.id).toBeDefined();
  });

  it("proves releasing/cancelling a claim immediately frees the slot for a new claim", async () => {
    // Explanation: The exclusion constraint has `WHERE (status = 'active')`.
    // When a booking is cancelled or a block released, `status = 'released'`.
    // A new claim on the previously occupied time window must succeed immediately.
    const start = new Date("2026-12-05T10:00:00+03:00");
    const end = new Date("2026-12-05T16:00:00+03:00");

    const initialClaim = await createSlotClaim({
      hallId: hall1Id,
      startTime: start,
      endTime: end,
      claimType: "block",
      reason: "Tentative hold",
      createdById: managerId,
    });

    // Attempting overlapping claim fails while active
    await expect(
      createSlotClaim({
        hallId: hall1Id,
        startTime: start,
        endTime: end,
        claimType: "block",
        reason: "Collision while active",
        createdById: managerId,
      })
    ).rejects.toThrow(/exclusion constraint|overlapping|double-booking/i);

    // Release initial claim
    await releaseSlotClaim(initialClaim.id, managerId);
    const updated = await getSlotClaimById(initialClaim.id);
    expect(updated?.status).toBe("released");

    // New claim on the EXACT same time slot must now SUCCEED
    const replacementClaim = await createSlotClaim({
      hallId: hall1Id,
      startTime: start,
      endTime: end,
      claimType: "block",
      reason: "Confirmed new client",
      createdById: managerId,
    });

    expect(replacementClaim.id).toBeDefined();
  });

  it("proves simultaneous concurrent writes for overlapping slots result in exactly one winner and one constraint violation", async () => {
    // Explanation: Concurrency stress test. Two asynchronous promises attempt to insert
    // overlapping claims simultaneously.
    // The database transaction engine and GIST index lock serialize the check:
    // exactly 1 must succeed (fulfilled) and 1 must fail (rejected).
    const start = new Date("2026-12-05T11:00:00+03:00");
    const end = new Date("2026-12-05T17:00:00+03:00");

    const promise1 = createSlotClaim({
      hallId: hall1Id,
      startTime: start,
      endTime: end,
      claimType: "block",
      reason: "Concurrent Request 1",
      createdById: managerId,
    });

    const promise2 = createSlotClaim({
      hallId: hall1Id,
      startTime: start,
      endTime: end,
      claimType: "block",
      reason: "Concurrent Request 2",
      createdById: managerId,
    });

    const results = await Promise.allSettled([promise1, promise2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    if (rejected[0].status === "rejected") {
      expect(rejected[0].reason.message).toMatch(/exclusion constraint|overlapping|double-booking/i);
    }
  });
});
