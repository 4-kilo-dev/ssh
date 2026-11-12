/**
 * Phase 3 — Mini-Task 3.2: Hall Schema & Service Integration Tests
 *
 * Tests the Hall domain lifecycle and strict ownership boundaries:
 * 1. A hall is the bookable unit and must belong to exactly one venue.
 * 2. Only the owning manager of a venue can create, update, or delete halls in that venue.
 * 3. Another manager (Manager B) cannot touch Manager A's halls.
 * 4. Hall names must be unique within the same venue (e.g. no duplicate "Ballroom A").
 * 5. Capacity must be a positive integer (> 0).
 * 6. Hall settings must be one of: 'indoor', 'covered-outdoor', 'uncovered-outdoor'.
 * 7. Deleting a venue cascades to delete all associated halls.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue, deleteVenue } from "../../lib/services/venue-service";
import {
  createHall,
  getHallById,
  getHallsByVenueId,
  updateHall,
  deleteHall,
} from "../../lib/services/hall-service";

describe("Phase 3 — Mini-Task 3.2: Hall Domain & Ownership Boundaries", () => {
  beforeEach(async () => {
    // Reset test database with clean schema and all migrations
    await setupTestDatabase();
  });

  it("proves a venue manager can create halls under their venue", async () => {
    // Explanation: A manager creates multiple distinct bookable halls under their venue.
    const manager = await createAccount({
      phone: "+251911000001",
      name: "Solomon Manager",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Grand Palace Hotel",
      area: "Kazanchis",
      type: "Hotel ballroom",
    });

    const hall1 = await createHall(manager.id, {
      venueId: venue.id,
      name: "Grand Ballroom",
      capacity: 500,
      setting: "indoor",
      notes: "Main ballroom on 1st floor with chandeliers.",
    });

    const hall2 = await createHall(manager.id, {
      venueId: venue.id,
      name: "Skyline Terrace",
      capacity: 150,
      setting: "covered-outdoor",
      notes: "Rooftop covered terrace overlooking the city.",
    });

    expect(hall1.id).toBeDefined();
    expect(hall1.venueId).toBe(venue.id);
    expect(hall1.name).toBe("Grand Ballroom");
    expect(hall1.capacity).toBe(500);
    expect(hall1.setting).toBe("indoor");

    expect(hall2.id).toBeDefined();
    expect(hall2.name).toBe("Skyline Terrace");

    // Proves getHallsByVenueId returns all halls for that venue
    const halls = await getHallsByVenueId(venue.id);
    expect(halls).toHaveLength(2);
    expect(halls.map((h) => h.name)).toContain("Grand Ballroom");
    expect(halls.map((h) => h.name)).toContain("Skyline Terrace");
  });

  it("proves a manager cannot add a hall to another manager's venue (ownership boundary)", async () => {
    // Explanation: Manager B must NOT be allowed to add a hall to Manager A's venue.
    const managerA = await createAccount({
      phone: "+251911000002",
      name: "Manager Alpha",
      role: "venue_manager",
    });
    const managerB = await createAccount({
      phone: "+251911000003",
      name: "Manager Beta",
      role: "venue_manager",
    });

    const venueA = await createVenue({
      managerId: managerA.id,
      name: "Alpha Resort",
      area: "Bole",
      type: "Hotel ballroom",
    });

    // Manager B attempts to create hall in Manager A's venue
    await expect(
      createHall(managerB.id, {
        venueId: venueA.id,
        name: "Intruder Hall",
        capacity: 100,
        setting: "indoor",
      })
    ).rejects.toThrow(/unauthorized.*not the owner/i);

    // Verify venue A has no halls created
    const halls = await getHallsByVenueId(venueA.id);
    expect(halls).toHaveLength(0);
  });

  it("proves duplicate hall name within the same venue is rejected", async () => {
    // Explanation: Two halls in the same venue cannot share the exact same name.
    const manager = await createAccount({
      phone: "+251911000004",
      name: "Manager Gamma",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Gamma Pavilion",
      area: "Sar Bet",
      type: "Conference space",
    });

    await createHall(manager.id, {
      venueId: venue.id,
      name: "Conference Hall A",
      capacity: 80,
      setting: "indoor",
    });

    // Attempt to create duplicate with same name
    await expect(
      createHall(manager.id, {
        venueId: venue.id,
        name: "Conference Hall A",
        capacity: 120,
        setting: "indoor",
      })
    ).rejects.toThrow(/already exists/i);
  });

  it("proves duplicate hall name across DIFFERENT venues is allowed", async () => {
    // Explanation: Two different venues can each legitimately have a hall named "Main Hall".
    const manager1 = await createAccount({
      phone: "+251911000005",
      name: "Manager Delta 1",
      role: "venue_manager",
    });
    const manager2 = await createAccount({
      phone: "+251911000006",
      name: "Manager Delta 2",
      role: "venue_manager",
    });

    const venue1 = await createVenue({
      managerId: manager1.id,
      name: "Venue 1",
      area: "Bole",
      type: "Wedding hall",
    });
    const venue2 = await createVenue({
      managerId: manager2.id,
      name: "Venue 2",
      area: "CMC",
      type: "Wedding hall",
    });

    const hall1 = await createHall(manager1.id, {
      venueId: venue1.id,
      name: "Main Hall",
      capacity: 300,
      setting: "indoor",
    });
    const hall2 = await createHall(manager2.id, {
      venueId: venue2.id,
      name: "Main Hall",
      capacity: 400,
      setting: "indoor",
    });

    expect(hall1.name).toBe("Main Hall");
    expect(hall2.name).toBe("Main Hall");
    expect(hall1.venueId).not.toBe(hall2.venueId);
  });

  it("proves invalid capacity (<= 0) is rejected", async () => {
    // Explanation: Hall capacity must be a positive integer.
    const manager = await createAccount({
      phone: "+251911000007",
      name: "Manager Epsilon",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Epsilon Gardens",
      area: "Old Airport",
      type: "Garden venue",
    });

    await expect(
      createHall(manager.id, {
        venueId: venue.id,
        name: "Zero Cap Hall",
        capacity: 0,
        setting: "indoor",
      })
    ).rejects.toThrow(/capacity must be greater than zero/i);

    await expect(
      createHall(manager.id, {
        venueId: venue.id,
        name: "Negative Cap Hall",
        capacity: -10,
        setting: "indoor",
      })
    ).rejects.toThrow(/capacity must be greater than zero/i);
  });

  it("proves a manager can update their venue's hall", async () => {
    // Explanation: The authorized owner can update hall capacity, setting, name, and notes.
    const manager = await createAccount({
      phone: "+251911000008",
      name: "Manager Zeta",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Zeta Center",
      area: "Mexico",
      type: "Conference space",
    });

    const hall = await createHall(manager.id, {
      venueId: venue.id,
      name: "Small Room",
      capacity: 50,
      setting: "indoor",
    });

    const updated = await updateHall(hall.id, manager.id, {
      name: "Expanded Boardroom",
      capacity: 75,
      notes: "Upgraded with video conference system.",
    });

    expect(updated.name).toBe("Expanded Boardroom");
    expect(updated.capacity).toBe(75);
    expect(updated.notes).toBe("Upgraded with video conference system.");
  });

  it("proves a manager cannot update another venue's hall (ownership boundary)", async () => {
    // Explanation: Manager B cannot update a hall belonging to Manager A's venue.
    const managerA = await createAccount({
      phone: "+251911000009",
      name: "Manager Owner",
      role: "venue_manager",
    });
    const managerB = await createAccount({
      phone: "+251911000010",
      name: "Manager Hacker",
      role: "venue_manager",
    });

    const venueA = await createVenue({
      managerId: managerA.id,
      name: "Venue A",
      area: "Bole",
      type: "Hotel ballroom",
    });

    const hallA = await createHall(managerA.id, {
      venueId: venueA.id,
      name: "Exclusive Ballroom",
      capacity: 200,
      setting: "indoor",
    });

    await expect(
      updateHall(hallA.id, managerB.id, {
        name: "Compromised Name",
        capacity: 10,
      })
    ).rejects.toThrow(/unauthorized.*not the owner/i);

    // Verify hall remained unchanged
    const pristine = await getHallById(hallA.id);
    expect(pristine?.name).toBe("Exclusive Ballroom");
    expect(pristine?.capacity).toBe(200);
  });

  it("proves a manager can delete their venue's hall", async () => {
    // Explanation: Authorized owner can delete a hall.
    const manager = await createAccount({
      phone: "+251911000011",
      name: "Manager Theta",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Theta Venue",
      area: "Piassa",
      type: "Wedding hall",
    });

    const hall = await createHall(manager.id, {
      venueId: venue.id,
      name: "Demolished Annex",
      capacity: 60,
      setting: "indoor",
    });

    await deleteHall(hall.id, manager.id);

    const check = await getHallById(hall.id);
    expect(check).toBeNull();
  });

  it("proves a manager cannot delete another venue's hall (ownership boundary)", async () => {
    // Explanation: Manager B cannot delete Manager A's hall.
    const managerA = await createAccount({
      phone: "+251911000012",
      name: "Manager A Owner",
      role: "venue_manager",
    });
    const managerB = await createAccount({
      phone: "+251911000013",
      name: "Manager B Rogue",
      role: "venue_manager",
    });

    const venueA = await createVenue({
      managerId: managerA.id,
      name: "Venue Protected",
      area: "Bole",
      type: "Wedding hall",
    });

    const hall = await createHall(managerA.id, {
      venueId: venueA.id,
      name: "Protected Hall",
      capacity: 150,
      setting: "indoor",
    });

    await expect(deleteHall(hall.id, managerB.id)).rejects.toThrow(/unauthorized.*not the owner/i);

    const check = await getHallById(hall.id);
    expect(check).not.toBeNull();
  });

  it("proves deleting a venue automatically cascades and deletes all associated halls", async () => {
    // Explanation: Relational integrity rule: when a venue is deleted, all its halls are deleted via ON DELETE CASCADE.
    const manager = await createAccount({
      phone: "+251911000014",
      name: "Manager Cascade",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Cascade Complex",
      area: "Yeka",
      type: "Conference space",
    });

    const hall1 = await createHall(manager.id, {
      venueId: venue.id,
      name: "Hall One",
      capacity: 100,
      setting: "indoor",
    });

    const hall2 = await createHall(manager.id, {
      venueId: venue.id,
      name: "Hall Two",
      capacity: 200,
      setting: "indoor",
    });

    // Delete venue
    await deleteVenue(venue.id, manager.id);

    // Verify halls are gone
    expect(await getHallById(hall1.id)).toBeNull();
    expect(await getHallById(hall2.id)).toBeNull();
  });
});
