/**
 * Phase 3 — Mini-Task 3.1: Venue Schema & Service Integration Tests
 *
 * Tests the venue lifecycle and strict ownership boundaries:
 * 1. A venue must be owned by an account with the 'venue_manager' role.
 * 2. Non-manager accounts (user, vendor) cannot create or own a venue.
 * 3. Each manager can own at most one venue (1:1 manager-to-venue rule).
 * 4. Venue updates and deletions strictly require the owning manager's identity;
 *    foreign managers or unauthenticated callers are rejected.
 * 5. Public venue lookup and filtering work accurately.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import {
  createVenue,
  getVenueById,
  getVenueByManagerId,
  updateVenue,
  deleteVenue,
  listVenues,
} from "../../lib/services/venue-service";

describe("Phase 3 — Mini-Task 3.1: Venue Domain & Ownership Boundaries", () => {
  beforeEach(async () => {
    // Reset test database with clean schema and all migrations
    await setupTestDatabase();
  });

  it("proves a venue manager can create a venue", async () => {
    // Explanation: A registered venue_manager account must be able to register their venue.
    const manager = await createAccount({
      phone: "+251911111111",
      name: "Abebe Venue Manager",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Bole Skyline Hall",
      area: "Bole",
      type: "Hotel ballroom",
      description: "Modern ballroom near Bole airport with full audio-visual suite.",
      contactPhone: "+251911111111",
      contactEmail: "skyline@example.com",
      policies: "No smoking indoors. 50% deposit required off-platform.",
      amenities: ["Parking", "Wi-Fi", "Stage", "Accessible entry"],
    });

    expect(venue).toBeDefined();
    expect(venue.id).toBeDefined();
    expect(venue.managerId).toBe(manager.id);
    expect(venue.name).toBe("Bole Skyline Hall");
    expect(venue.area).toBe("Bole");
    expect(venue.amenities).toEqual(["Parking", "Wi-Fi", "Stage", "Accessible entry"]);

    // Verify retrieval by ID
    const retrieved = await getVenueById(venue.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(venue.id);
    expect(retrieved?.name).toBe("Bole Skyline Hall");
  });

  it("proves a non-manager account cannot create a venue", async () => {
    // Explanation: Regular users and vendors must not be permitted to register venues.
    // Enforces role-based domain boundaries at the service level.
    const regularUser = await createAccount({
      phone: "+251922222222",
      name: "Chala Customer",
      role: "user",
    });

    await expect(
      createVenue({
        managerId: regularUser.id,
        name: "Unauthorized User Venue",
        area: "Piassa",
        type: "Wedding hall",
      })
    ).rejects.toThrow(/only venue_manager accounts can own a venue/i);

    const vendor = await createAccount({
      phone: "+251933333333",
      name: "Tigist Caterer",
      role: "vendor",
    });

    await expect(
      createVenue({
        managerId: vendor.id,
        name: "Unauthorized Vendor Venue",
        area: "Kazanchis",
        type: "Garden venue",
      })
    ).rejects.toThrow(/only venue_manager accounts can own a venue/i);
  });

  it("proves a manager cannot own more than one venue (1:1 manager-to-venue rule)", async () => {
    // Explanation: The agreed data model dictates that one manager owns one entire venue.
    // Attempting to register a second venue under the same manager ID must fail with a constraint violation.
    const manager = await createAccount({
      phone: "+251944444444",
      name: "Dawit Manager",
      role: "venue_manager",
    });

    await createVenue({
      managerId: manager.id,
      name: "First Venue Plaza",
      area: "CMC",
      type: "Conference space",
    });

    await expect(
      createVenue({
        managerId: manager.id,
        name: "Second Venue Plaza",
        area: "Yeka",
        type: "Wedding hall",
      })
    ).rejects.toThrow(/manager already owns a venue/i);
  });

  it("proves a manager can update their own venue", async () => {
    // Explanation: An authorized manager can edit description, policies, amenities, etc.
    const manager = await createAccount({
      phone: "+251955555555",
      name: "Eleni Manager",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Old Airport Garden",
      area: "Old Airport",
      type: "Garden venue",
      description: "Lush green space for outdoor celebrations.",
    });

    const updated = await updateVenue(venue.id, manager.id, {
      description: "Updated lush garden with brand new pavilion and lighting.",
      policies: "Outdoor music until 10 PM.",
      amenities: ["Parking", "Garden", "Catering"],
    });

    expect(updated.description).toBe("Updated lush garden with brand new pavilion and lighting.");
    expect(updated.policies).toBe("Outdoor music until 10 PM.");
    expect(updated.amenities).toEqual(["Parking", "Garden", "Catering"]);
  });

  it("proves updating a venue is strictly rejected when caller is a different manager", async () => {
    // Explanation: Manager A must NOT be allowed to mutate Manager B's venue.
    // This is a critical security and ownership boundary.
    const managerA = await createAccount({
      phone: "+251966666666",
      name: "Manager Alice",
      role: "venue_manager",
    });
    const managerB = await createAccount({
      phone: "+251977777777",
      name: "Manager Bob",
      role: "venue_manager",
    });

    const venueA = await createVenue({
      managerId: managerA.id,
      name: "Alice's Grand Hall",
      area: "Bole",
      type: "Hotel ballroom",
    });

    // Manager B attempts to update Manager A's venue
    await expect(
      updateVenue(venueA.id, managerB.id, {
        name: "Tampered By Bob",
      })
    ).rejects.toThrow(/unauthorized.*not the owner/i);

    // Verify venue A's name was not modified
    const untouched = await getVenueById(venueA.id);
    expect(untouched?.name).toBe("Alice's Grand Hall");
  });

  it("proves deleting a venue succeeds for the owner manager", async () => {
    // Explanation: The authorized owner manager can delete their venue record.
    const manager = await createAccount({
      phone: "+251988888888",
      name: "Owner Manager",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Temporary Event Pavilion",
      area: "Mexico",
      type: "Conference space",
    });

    await deleteVenue(venue.id, manager.id);

    const deleted = await getVenueById(venue.id);
    expect(deleted).toBeNull();
  });

  it("proves deleting a venue is rejected when requested by a non-owner", async () => {
    // Explanation: Unauthorized accounts cannot delete other managers' venues.
    const managerA = await createAccount({
      phone: "+251999999991",
      name: "Manager Alpha",
      role: "venue_manager",
    });
    const managerB = await createAccount({
      phone: "+251999999992",
      name: "Manager Beta",
      role: "venue_manager",
    });

    const venueA = await createVenue({
      managerId: managerA.id,
      name: "Alpha Exclusive",
      area: "Sar Bet",
      type: "Wedding hall",
    });

    await expect(deleteVenue(venueA.id, managerB.id)).rejects.toThrow(/unauthorized.*not the owner/i);

    // Confirm it still exists
    const stillThere = await getVenueById(venueA.id);
    expect(stillThere).not.toBeNull();
  });

  it("proves listVenues filters by area and search query", async () => {
    // Explanation: Public directory queries need to filter venues by geographic area or text match.
    const manager1 = await createAccount({
      phone: "+251999999993",
      name: "Manager Bole",
      role: "venue_manager",
    });
    const manager2 = await createAccount({
      phone: "+251999999994",
      name: "Manager CMC",
      role: "venue_manager",
    });

    await createVenue({
      managerId: manager1.id,
      name: "Imperial Bole Hall",
      area: "Bole",
      type: "Hotel ballroom",
      description: "Luxury wedding and event ballroom in the heart of Bole.",
    });

    await createVenue({
      managerId: manager2.id,
      name: "Sunflower Garden CMC",
      area: "CMC",
      type: "Garden venue",
      description: "Spacious outdoor lawn with flowering trees in CMC.",
    });

    const boleVenues = await listVenues({ area: "Bole" });
    expect(boleVenues).toHaveLength(1);
    expect(boleVenues[0].name).toBe("Imperial Bole Hall");

    const searchGarden = await listVenues({ query: "lawn" });
    expect(searchGarden).toHaveLength(1);
    expect(searchGarden[0].name).toBe("Sunflower Garden CMC");
  });
});
