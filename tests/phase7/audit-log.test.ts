/**
 * Phase 7 — Mini-Task 7.1: Append-Only Audit Log Engine & Immutability Invariant Tests
 *
 * Requirements from docs/phases.md & docs/assumptions-and-schema.md:
 * 1. Non-negotiable Audit Invariant:
 *    - Because of the marketplace trust and double-booking invariants, EVERY mutating
 *      action (slot block created/released, booking requested/confirmed/cancelled, account created)
 *      must record who did what, when, and to which target entity.
 * 2. Immutability (Append-Only):
 *    - Audit logs are strictly append-only.
 *    - Update and delete operations on audit logs are strictly rejected/forbidden.
 * 3. Scoped Visibility:
 *    - Only `super_admin` can query system-wide audit logs.
 *    - Non-admin callers attempting to query audit logs receive a 403 Forbidden / unauthorized rejection.
 * 4. Filtering:
 *    - Supports filtering audit entries by `actorId`, `action`, and `targetType`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import { createSlotBlock, releaseSlotBlock } from "../../lib/services/slot-block-service";
import { createBooking, confirmBooking, cancelBooking } from "../../lib/services/booking-service";
import {
  logAuditEvent,
  listAuditLogs,
  getAuditLogById,
  deleteAuditLogAttempt,
  updateAuditLogAttempt,
} from "../../lib/services/audit-service";

describe("Phase 7 — Mini-Task 7.1: Append-Only Audit Log Engine & Immutability Invariant", () => {
  let adminId: string;
  let managerId: string;
  let customerId: string;
  let venueId: string;
  let hallId: string;

  beforeEach(async () => {
    await setupTestDatabase();

    // 1. Super Admin
    const admin = await createAccount({
      phone: "+251919000000",
      name: "System Super Admin",
      role: "super_admin",
    });
    adminId = admin.id;

    // 2. Manager & Venue & Hall
    const manager = await createAccount({
      phone: "+251919000001",
      name: "Audit Test Manager",
      role: "venue_manager",
    });
    managerId = manager.id;

    const venue = await createVenue({
      managerId,
      name: "Audit Grand Pavilion",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueId = venue.id;

    const hall = await createHall(managerId, {
      venueId,
      name: "Audit Ballroom",
      capacity: 400,
      setting: "indoor",
    });
    hallId = hall.id;

    // 3. Customer
    const customer = await createAccount({
      phone: "+251919000002",
      name: "Audit Test Customer",
      role: "user",
    });
    customerId = customer.id;
  });

  it("proves creating and releasing a SlotBlock writes immutable audit log events", async () => {
    // Explanation: Manager places an off-platform manual block, then releases it.
    // Both operations must append audit entries with exact actor, action, and target IDs.
    const start = new Date("2026-12-25T10:00:00Z");
    const end = new Date("2026-12-25T16:00:00Z");

    const block = await createSlotBlock({
      hallId,
      startTime: start,
      endTime: end,
      reason: "VIP Private Summit",
      managerId,
    });

    // Check audit logs for slot_block.created
    const logsAfterCreate = await listAuditLogs({
      callerId: adminId,
      targetType: "slot_block",
      action: "slot_block.created",
    });

    expect(logsAfterCreate.length).toBeGreaterThanOrEqual(1);
    const createLog = logsAfterCreate.find((l) => l.targetId === block.id);
    expect(createLog).toBeDefined();
    expect(createLog?.actorId).toBe(managerId);
    expect(createLog?.action).toBe("slot_block.created");
    expect(createLog?.targetType).toBe("slot_block");
    expect(createLog?.metadata).toMatchObject({
      hallId,
      reason: "VIP Private Summit",
    });

    // Release the block
    await releaseSlotBlock({
      blockId: block.id,
      managerId,
    });

    // Check audit logs for slot_block.released
    const logsAfterRelease = await listAuditLogs({
      callerId: adminId,
      targetType: "slot_block",
      action: "slot_block.released",
    });

    expect(logsAfterRelease.length).toBeGreaterThanOrEqual(1);
    const releaseLog = logsAfterRelease.find((l) => l.targetId === block.id);
    expect(releaseLog).toBeDefined();
    expect(releaseLog?.actorId).toBe(managerId);
    expect(releaseLog?.action).toBe("slot_block.released");
  });

  it("proves booking creation, confirmation, and cancellation write distinct audit log events", async () => {
    // 1. Customer requests a booking
    const start = new Date("2026-12-26T12:00:00Z");
    const end = new Date("2026-12-26T18:00:00Z");

    const booking = await createBooking({
      venueId,
      customerId,
      hallIds: [hallId],
      startTime: start,
      endTime: end,
      guestCount: 200,
      notes: "Wedding banquet",
    });

    // Verify booking.created audit log
    const createLogs = await listAuditLogs({
      callerId: adminId,
      targetType: "booking",
      action: "booking.created",
    });
    const bookingCreatedLog = createLogs.find((l) => l.targetId === booking.id);
    expect(bookingCreatedLog).toBeDefined();
    expect(bookingCreatedLog?.actorId).toBe(customerId);
    expect(bookingCreatedLog?.action).toBe("booking.created");

    // 2. Manager confirms the booking
    await confirmBooking({
      bookingId: booking.id,
      callerId: managerId,
    });

    // Verify booking.confirmed audit log
    const confirmLogs = await listAuditLogs({
      callerId: adminId,
      targetType: "booking",
      action: "booking.confirmed",
    });
    const bookingConfirmedLog = confirmLogs.find((l) => l.targetId === booking.id);
    expect(bookingConfirmedLog).toBeDefined();
    expect(bookingConfirmedLog?.actorId).toBe(managerId);

    // 3. Customer cancels the booking
    await cancelBooking({
      bookingId: booking.id,
      callerId: customerId,
      reason: "Plans cancelled",
    });

    // Verify booking.cancelled audit log
    const cancelLogs = await listAuditLogs({
      callerId: adminId,
      targetType: "booking",
      action: "booking.cancelled",
    });
    const bookingCancelledLog = cancelLogs.find((l) => l.targetId === booking.id);
    expect(bookingCancelledLog).toBeDefined();
    expect(bookingCancelledLog?.actorId).toBe(customerId);
    expect(bookingCancelledLog?.metadata).toMatchObject({
      reason: "Plans cancelled",
    });
  });

  it("proves audit logs are strictly append-only (immutable): updates and deletes are rejected", async () => {
    // Create an explicit audit log entry
    const entry = await logAuditEvent({
      actorId: adminId,
      action: "security.policy_updated",
      targetType: "system",
      targetId: "global_policy",
      metadata: { policy: "strict_gist_exclusion" },
    });

    expect(entry.id).toBeDefined();

    // 1. Attempting to update the audit log entry is strictly rejected
    await expect(
      updateAuditLogAttempt({
        id: entry.id,
        action: "tampered.action",
      })
    ).rejects.toThrow(/immutable|append-only|cannot update/i);

    // 2. Attempting to delete the audit log entry is strictly rejected
    await expect(
      deleteAuditLogAttempt(entry.id)
    ).rejects.toThrow(/immutable|append-only|cannot delete/i);

    // Verify record remains unchanged in database
    const fetched = await getAuditLogById(entry.id);
    expect(fetched).toBeDefined();
    expect(fetched?.action).toBe("security.policy_updated");
  });

  it("proves non-admin accounts cannot access the audit log (403 authorization boundary)", async () => {
    // Manager tries to access audit log
    await expect(
      listAuditLogs({
        callerId: managerId,
      })
    ).rejects.toThrow(/not authorized|forbidden|super_admin required/i);

    // Customer tries to access audit log
    await expect(
      listAuditLogs({
        callerId: customerId,
      })
    ).rejects.toThrow(/not authorized|forbidden|super_admin required/i);
  });
});
