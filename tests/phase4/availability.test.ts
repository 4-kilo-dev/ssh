/**
 * Phase 4 — Mini-Task 4.2: SlotBlock & Derived Availability Integration Tests
 *
 * Requirements from docs/phases.md and docs/assumptions-and-schema.md:
 * 1. SlotBlock (manual block): Off-platform collision defense. A venue manager
 *    marks a hall unavailable for [date, startTime, endTime] with a reason.
 * 2. Ownership boundary: Only the manager who owns the venue can block/release halls.
 * 3. Derived availability: Availability is derived dynamically at query time, NEVER stored as a flag.
 * 4. Multi-hall venue inquiry: `findAvailableHalls` filters out halls with active claims.
 * 5. Releasing a block immediately restores derived availability.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import {
  createSlotBlock,
  releaseSlotBlock,
  getSlotBlocksByHall,
} from "../../lib/services/slot-block-service";
import {
  checkHallAvailability,
  findAvailableHalls,
  getHallAvailabilityTimeline,
} from "../../lib/services/availability-service";

describe("Phase 4 — Mini-Task 4.2: SlotBlock & Derived Availability Engine", () => {
  let managerAId: string;
  let managerBId: string;
  let venueAId: string;
  let hallA1Id: string;
  let hallA2Id: string;

  beforeEach(async () => {
    // Reset test database with clean schema and migrations
    await setupTestDatabase();

    const managerA = await createAccount({
      phone: "+251914100001",
      name: "Manager Alice",
      role: "venue_manager",
    });
    managerAId = managerA.id;

    const managerB = await createAccount({
      phone: "+251914100002",
      name: "Manager Bob",
      role: "venue_manager",
    });
    managerBId = managerB.id;

    const venueA = await createVenue({
      managerId: managerAId,
      name: "Alice Grand Pavilion",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueAId = venueA.id;

    const hall1 = await createHall(managerAId, {
      venueId: venueA.id,
      name: "Imperial Hall",
      capacity: 350,
      setting: "indoor",
    });
    hallA1Id = hall1.id;

    const hall2 = await createHall(managerAId, {
      venueId: venueA.id,
      name: "Garden Gazebo",
      capacity: 120,
      setting: "covered-outdoor",
    });
    hallA2Id = hall2.id;
  });

  it("proves a manager can place an off-platform manual SlotBlock on their hall", async () => {
    // Explanation: Manager blocks a slot to prevent platform bookings when an off-platform event is held.
    const start = new Date("2026-12-10T14:00:00+03:00");
    const end = new Date("2026-12-10T20:00:00+03:00");

    const block = await createSlotBlock({
      managerId: managerAId,
      hallId: hallA1Id,
      startTime: start,
      endTime: end,
      reason: "Off-platform corporate seminar booked via phone",
    });

    expect(block.id).toBeDefined();
    expect(block.hallId).toBe(hallA1Id);
    expect(block.claimType).toBe("block");
    expect(block.status).toBe("active");
    expect(block.reason).toBe("Off-platform corporate seminar booked via phone");

    const activeBlocks = await getSlotBlocksByHall(hallA1Id);
    expect(activeBlocks).toHaveLength(1);
    expect(activeBlocks[0].id).toBe(block.id);
  });

  it("proves a manager cannot place a SlotBlock on another manager's hall (ownership boundary)", async () => {
    // Explanation: Manager B must be blocked from placing locks on Manager A's hall.
    const start = new Date("2026-12-10T10:00:00+03:00");
    const end = new Date("2026-12-10T14:00:00+03:00");

    await expect(
      createSlotBlock({
        managerId: managerBId,
        hallId: hallA1Id,
        startTime: start,
        endTime: end,
        reason: "Unauthorized intruder block",
      })
    ).rejects.toThrow(/unauthorized.*not the owner/i);

    const activeBlocks = await getSlotBlocksByHall(hallA1Id);
    expect(activeBlocks).toHaveLength(0);
  });

  it("proves invalid block time range (startTime >= endTime) is rejected", async () => {
    // Explanation: Time windows must have positive duration.
    const t = new Date("2026-12-10T15:00:00+03:00");

    await expect(
      createSlotBlock({
        managerId: managerAId,
        hallId: hallA1Id,
        startTime: t,
        endTime: t,
        reason: "Zero duration block",
      })
    ).rejects.toThrow(/start time must be strictly before end time/i);
  });

  it("proves derived availability reports available: false when a slot block overlaps", async () => {
    // Explanation: There is no 'available' boolean column in the DB.
    // Calling checkHallAvailability derives whether the slot is free by checking active claims.
    const blockStart = new Date("2026-12-10T12:00:00+03:00");
    const blockEnd = new Date("2026-12-10T18:00:00+03:00");

    await createSlotBlock({
      managerId: managerAId,
      hallId: hallA1Id,
      startTime: blockStart,
      endTime: blockEnd,
      reason: "Private wedding banquet",
    });

    // 1. Query overlapping window (14:00 - 16:00) -> NOT AVAILABLE
    const checkOverlap = await checkHallAvailability(
      hallA1Id,
      new Date("2026-12-10T14:00:00+03:00"),
      new Date("2026-12-10T16:00:00+03:00")
    );
    expect(checkOverlap.available).toBe(false);
    expect(checkOverlap.conflict).toBeDefined();
    expect(checkOverlap.conflict?.reason).toBe("Private wedding banquet");

    // 2. Query non-overlapping morning window (08:00 - 12:00) -> AVAILABLE
    const checkFreeMorning = await checkHallAvailability(
      hallA1Id,
      new Date("2026-12-10T08:00:00+03:00"),
      new Date("2026-12-10T12:00:00+03:00")
    );
    expect(checkFreeMorning.available).toBe(true);
    expect(checkFreeMorning.conflict).toBeNull();

    // 3. Query non-overlapping evening window (18:00 - 22:00) -> AVAILABLE
    const checkFreeEvening = await checkHallAvailability(
      hallA1Id,
      new Date("2026-12-10T18:00:00+03:00"),
      new Date("2026-12-10T22:00:00+03:00")
    );
    expect(checkFreeEvening.available).toBe(true);
  });

  it("proves releasing a SlotBlock immediately restores derived availability", async () => {
    // Explanation: Dynamic availability query reflects state changes without stale cache.
    const start = new Date("2026-12-11T10:00:00+03:00");
    const end = new Date("2026-12-11T16:00:00+03:00");

    const block = await createSlotBlock({
      managerId: managerAId,
      hallId: hallA1Id,
      startTime: start,
      endTime: end,
      reason: "Maintenance / painting",
    });

    // Verify unavailable
    const check1 = await checkHallAvailability(hallA1Id, start, end);
    expect(check1.available).toBe(false);

    // Release block
    await releaseSlotBlock(block.id, managerAId);

    // Verify available
    const check2 = await checkHallAvailability(hallA1Id, start, end);
    expect(check2.available).toBe(true);
  });

  it("proves findAvailableHalls filters only free halls under a venue", async () => {
    // Explanation: Inquiries and booking flows need to determine which halls in a venue are free for a time range.
    // Hall 1 is blocked 12:00 - 18:00.
    // Hall 2 is free.
    // Querying for 13:00 - 16:00 should return ONLY Hall 2.
    const start = new Date("2026-12-12T12:00:00+03:00");
    const end = new Date("2026-12-12T18:00:00+03:00");

    await createSlotBlock({
      managerId: managerAId,
      hallId: hallA1Id,
      startTime: start,
      endTime: end,
      reason: "Hall 1 in maintenance",
    });

    const targetStart = new Date("2026-12-12T13:00:00+03:00");
    const targetEnd = new Date("2026-12-12T16:00:00+03:00");

    const availableHalls = await findAvailableHalls(venueAId, targetStart, targetEnd);
    expect(availableHalls).toHaveLength(1);
    expect(availableHalls[0].id).toBe(hallA2Id);
    expect(availableHalls[0].name).toBe("Garden Gazebo");
  });

  it("proves getHallAvailabilityTimeline breaks down hourly slots accurately", async () => {
    // Explanation: Calendar visualization needs an hourly breakdown for a date (e.g. 08:00 to 22:00).
    const blockStart = new Date("2026-12-15T14:00:00+03:00");
    const blockEnd = new Date("2026-12-15T18:00:00+03:00");

    await createSlotBlock({
      managerId: managerAId,
      hallId: hallA1Id,
      startTime: blockStart,
      endTime: blockEnd,
      reason: "Evening Banquet",
    });

    const timeline = await getHallAvailabilityTimeline(hallA1Id, "2026-12-15");
    expect(timeline.date).toBe("2026-12-15");
    expect(timeline.slots.length).toBeGreaterThanOrEqual(12);

    // Slot 10:00 - 11:00 is free
    const slot10 = timeline.slots.find((s) => s.hour === 10);
    expect(slot10?.status).toBe("free");

    // Slot 15:00 - 16:00 is held/blocked
    const slot15 = timeline.slots.find((s) => s.hour === 15);
    expect(slot15?.status).toBe("held");
    expect(slot15?.reason).toBe("Evening Banquet");
  });
});
