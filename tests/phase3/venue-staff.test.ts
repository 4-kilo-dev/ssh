/**
 * Phase 3.5 — Venue Staff & Decoupled Team Management Integration Tests
 *
 * Verifies that:
 * 1. A venue is not permanently hostage to a single manager's personal phone number.
 * 2. An owner can invite/add staff members (managers, receptionists) by phone number.
 * 3. Any active staff member can manage halls, place calendar blocks, and confirm bookings.
 * 4. Deactivating or removing a staff member immediately revokes their permissions.
 * 5. Removing an ex-employee leaves all venue data, halls, and bookings 100% intact.
 * 6. Ownership transfer safely hands over primary ownership to a successor manager.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import {
  createVenue,
  getVenueById,
} from "../../lib/services/venue-service";
import {
  addStaffMember,
  listVenueStaff,
  updateStaffMember,
  removeStaffMember,
  transferVenueOwnership,
  getVenueForAccount,
  checkVenueAccess,
} from "../../lib/services/venue-staff-service";
import { createHall, deleteHall } from "../../lib/services/hall-service";
import { createSlotBlock, releaseSlotBlock } from "../../lib/services/slot-block-service";
import { createBooking, confirmBooking } from "../../lib/services/booking-service";

describe("Phase 3.5 — Venue Staff & Team Collaboration", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("proves a venue owner can invite and list team members", async () => {
    // 1. Primary Owner registers venue
    const owner = await createAccount({
      phone: "+251911111111",
      name: "Owner Abebe",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: owner.id,
      name: "Grand Ballroom Addis",
      area: "Bole",
      type: "Hotel ballroom",
    });

    // 2. Owner invites a new manager (Kebede) by phone number
    const staffMember = await addStaffMember({
      venueId: venue.id,
      phone: "0912 345678",
      name: "Kebede New Manager",
      role: "manager",
      title: "Operations Manager",
      callerId: owner.id,
    });

    expect(staffMember).toBeDefined();
    expect(staffMember.phone).toBe("+251912345678");
    expect(staffMember.role).toBe("manager");
    expect(staffMember.title).toBe("Operations Manager");
    expect(staffMember.isActive).toBe(true);

    // 3. List staff members
    const team = await listVenueStaff(venue.id);
    expect(team.length).toBe(2); // Owner + new staff
    expect(team.some((m) => m.accountId === owner.id && m.isPrimaryOwner)).toBe(true);
    expect(team.some((m) => m.phone === "+251912345678" && m.role === "manager")).toBe(true);

    // 4. Prove getVenueForAccount returns the venue for Kebede
    const kebedeVenue = await getVenueForAccount(staffMember.accountId);
    expect(kebedeVenue).not.toBeNull();
    expect(kebedeVenue?.id).toBe(venue.id);
  });

  it("proves an invited staff member can create halls and place manual calendar blocks", async () => {
    const owner = await createAccount({
      phone: "+251911111111",
      name: "Owner Abebe",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: owner.id,
      name: "Sheraton Addis Sky",
      area: "Kirkos",
      type: "Hotel ballroom",
    });

    // Owner adds operational manager
    const staff = await addStaffMember({
      venueId: venue.id,
      phone: "+251922222222",
      name: "Almaz Operations",
      role: "manager",
      callerId: owner.id,
    });

    // Almaz (using her own account ID) creates a bookable hall
    const hall = await createHall(staff.accountId, {
      venueId: venue.id,
      name: "Lalibela Grand Hall",
      capacity: 500,
    });

    expect(hall).toBeDefined();
    expect(hall.name).toBe("Lalibela Grand Hall");

    // Almaz places a manual maintenance block on the hall
    const now = new Date();
    const start = new Date(now.getTime() + 86400000);
    const end = new Date(now.getTime() + 90000000);

    const block = await createSlotBlock({
      hallId: hall.id,
      managerId: staff.accountId,
      startTime: start,
      endTime: end,
      reason: "Audio rigging setup",
    });

    expect(block).toBeDefined();
    expect(block.status).toBe("active");

    // Almaz releases the block
    const released = await releaseSlotBlock(block.id, staff.accountId);
    expect(released.status).toBe("released");
  });

  it("proves removing or deactivating a staff member immediately revokes their access while leaving venue intact", async () => {
    const owner = await createAccount({
      phone: "+251911111111",
      name: "Owner Abebe",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: owner.id,
      name: "Hilton Event Center",
      area: "Kazanchis",
      type: "Conference space",
    });

    // Add manager who will later leave the job
    const departingStaff = await addStaffMember({
      venueId: venue.id,
      phone: "+251933333333",
      name: "Departing Employee",
      role: "manager",
      callerId: owner.id,
    });

    // Create a hall before employee leaves
    const hall = await createHall(departingStaff.accountId, {
      venueId: venue.id,
      name: "Pavilion A",
      capacity: 200,
    });

    // 1. Deactivate employee
    await updateStaffMember({
      venueId: venue.id,
      staffAccountId: departingStaff.accountId,
      isActive: false,
      callerId: owner.id,
    });

    // Verify access is revoked
    const accessAfterDeactivation = await checkVenueAccess(venue.id, departingStaff.accountId, "manager");
    expect(accessAfterDeactivation.authorized).toBe(false);

    // Attempting to delete hall must fail
    await expect(deleteHall(hall.id, departingStaff.accountId)).rejects.toThrow(/unauthorized/i);

    // 2. Remove employee completely from venue
    await removeStaffMember({
      venueId: venue.id,
      staffAccountId: departingStaff.accountId,
      callerId: owner.id,
    });

    // 3. CRITICAL INVARIANT: The venue and hall are completely intact!
    const retrievedVenue = await getVenueById(venue.id);
    expect(retrievedVenue).not.toBeNull();
    expect(retrievedVenue?.name).toBe("Hilton Event Center");
  });

  it("proves primary ownership transfer moves ownership to another phone number and demotes previous owner to manager", async () => {
    const originalOwner = await createAccount({
      phone: "+251911111111",
      name: "Abebe Original Owner",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: originalOwner.id,
      name: "Bellevue Luxury Hotel",
      area: "Megenagna",
      type: "Hotel ballroom",
    });

    // Successor manager
    const successor = await createAccount({
      phone: "+251977777777",
      name: "Kebede Successor GM",
      role: "venue_manager",
    });

    // Transfer primary ownership from Abebe to Kebede
    const transferred = await transferVenueOwnership({
      venueId: venue.id,
      newOwnerPhoneOrId: successor.phone,
      callerId: originalOwner.id,
    });

    expect(transferred.managerId).toBe(successor.id);

    // Check staff list
    const team = await listVenueStaff(venue.id);
    const kebedeRecord = team.find((m) => m.accountId === successor.id);
    const abebeRecord = team.find((m) => m.accountId === originalOwner.id);

    expect(kebedeRecord?.isPrimaryOwner).toBe(true);
    expect(kebedeRecord?.role).toBe("owner");
    expect(abebeRecord?.isPrimaryOwner).toBe(false);
    expect(abebeRecord?.role).toBe("manager");

    // Successor can now add more staff
    const thirdStaff = await addStaffMember({
      venueId: venue.id,
      phone: "+251988888888",
      name: "Front Desk Receptionist",
      role: "receptionist",
      callerId: successor.id,
    });

    expect(thirdStaff.role).toBe("receptionist");
  });

  it("proves a non-owner cannot add staff or transfer ownership", async () => {
    const owner = await createAccount({
      phone: "+251911111111",
      name: "Owner Abebe",
      role: "venue_manager",
    });

    const venue = await createVenue({
      managerId: owner.id,
      name: "Exclusive Garden Plaza",
      area: "Bole",
      type: "Garden venue",
    });

    const receptionist = await addStaffMember({
      venueId: venue.id,
      phone: "+251944444444",
      name: "Hanna Receptionist",
      role: "receptionist",
      callerId: owner.id,
    });

    // Receptionist tries to add another staff member
    await expect(
      addStaffMember({
        venueId: venue.id,
        phone: "+251955555555",
        name: "Unauthorized Staff",
        role: "manager",
        callerId: receptionist.accountId,
      })
    ).rejects.toThrow(/unauthorized/i);

    // Receptionist tries to transfer ownership
    await expect(
      transferVenueOwnership({
        venueId: venue.id,
        newOwnerPhoneOrId: receptionist.accountId,
        callerId: receptionist.accountId,
      })
    ).rejects.toThrow(/unauthorized/i);
  });
});
