/**
 * Phase 7 — Mini-Task 7.2: Support Ticket Intake & Routing Service Tests
 *
 * Requirements from docs/phases.md:
 * 1. Support Ticket Intake:
 *    - Authenticated users (customers, venue managers) can submit support tickets.
 *    - Captures authorId, category, subject, and detailed message.
 *    - Automatically defaults status to 'open'.
 * 2. Routing & Visibility:
 *    - Authors can list and view their own submitted tickets.
 *    - Super Admin can list all support tickets system-wide with optional status filtering.
 *    - Non-admin callers attempting to view another user's ticket are rejected (403).
 * 3. Super Admin Resolution Workflow:
 *    - Super Admin can transition ticket status: 'open' -> 'in_progress' -> 'resolved'.
 *    - When resolved, `resolvedAt` timestamp is recorded.
 *    - Super Admin can record `adminNotes` on tickets.
 *    - Non-admin callers cannot modify ticket status or admin notes (403).
 *    - Mutating ticket actions write audit logs for full traceability.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import {
  createTicket,
  getTicketById,
  listTicketsForAccount,
  listAllTickets,
  updateTicketStatus,
} from "../../lib/services/ticket-service";
import { listAuditLogs } from "../../lib/services/audit-service";

describe("Phase 7 — Mini-Task 7.2: Support Ticket Intake & Routing", () => {
  let adminId: string;
  let customerAId: string;
  let customerBId: string;
  let managerId: string;

  beforeEach(async () => {
    await setupTestDatabase();

    // 1. Super Admin
    const admin = await createAccount({
      phone: "+251911999999",
      name: "Global Admin",
      role: "super_admin",
    });
    adminId = admin.id;

    // 2. Customer A
    const custA = await createAccount({
      phone: "+251911111111",
      name: "Customer Alpha",
      role: "user",
    });
    customerAId = custA.id;

    // 3. Customer B
    const custB = await createAccount({
      phone: "+251922222222",
      name: "Customer Beta",
      role: "user",
    });
    customerBId = custB.id;

    // 4. Venue Manager
    const mgr = await createAccount({
      phone: "+251933333333",
      name: "Manager Charlie",
      role: "venue_manager",
    });
    managerId = mgr.id;
  });

  it("proves an authenticated user can submit a support ticket in 'open' status and it writes an audit log", async () => {
    // Customer submits a booking dispute ticket
    const ticket = await createTicket({
      authorId: customerAId,
      category: "booking_dispute",
      subject: "Double-charged or deposit mismatch",
      message: "I paid the deposit off-platform but venue claims it was late.",
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.authorId).toBe(customerAId);
    expect(ticket.category).toBe("booking_dispute");
    expect(ticket.subject).toBe("Double-charged or deposit mismatch");
    expect(ticket.status).toBe("open");
    expect(ticket.resolvedAt).toBeNull();

    // Verify audit log entry was created
    const logs = await listAuditLogs({
      callerId: adminId,
      targetType: "support_ticket",
      action: "ticket.created",
    });
    const log = logs.find((l) => l.targetId === ticket.id);
    expect(log).toBeDefined();
    expect(log?.actorId).toBe(customerAId);
  });

  it("proves authors can view their own tickets, but foreign users are rejected (403 boundary)", async () => {
    const ticketA = await createTicket({
      authorId: customerAId,
      category: "general",
      subject: "Question about cancellation terms",
      message: "How many days in advance do I need to cancel?",
    });

    // Author Customer A can view ticket
    const fetchedByAuthor = await getTicketById(ticketA.id, customerAId);
    expect(fetchedByAuthor).toBeDefined();
    expect(fetchedByAuthor?.id).toBe(ticketA.id);

    // Super Admin can view any ticket
    const fetchedByAdmin = await getTicketById(ticketA.id, adminId);
    expect(fetchedByAdmin).toBeDefined();
    expect(fetchedByAdmin?.id).toBe(ticketA.id);

    // Foreign Customer B cannot view Customer A's ticket (throws 403 / unauthorized)
    await expect(getTicketById(ticketA.id, customerBId)).rejects.toThrow(
      /not authorized|forbidden/i
    );
  });

  it("proves listTicketsForAccount returns only caller's tickets, while super_admin listAllTickets sees all", async () => {
    // Ticket from Customer A
    await createTicket({
      authorId: customerAId,
      category: "technical",
      subject: "Cannot view calendar",
      message: "Calendar UI does not refresh on mobile.",
    });

    // Ticket from Manager Charlie
    await createTicket({
      authorId: managerId,
      category: "venue_verification",
      subject: "Update commercial registration",
      message: "Attached renewal document for Skylight ballroom.",
    });

    // Customer A list
    const custATickets = await listTicketsForAccount(customerAId);
    expect(custATickets.length).toBe(1);
    expect(custATickets[0].authorId).toBe(customerAId);

    // Manager Charlie list
    const mgrTickets = await listTicketsForAccount(managerId);
    expect(mgrTickets.length).toBe(1);
    expect(mgrTickets[0].authorId).toBe(managerId);

    // Super Admin lists all tickets
    const allTickets = await listAllTickets({ callerId: adminId });
    expect(allTickets.length).toBe(2);

    // Non-admin cannot call listAllTickets
    await expect(listAllTickets({ callerId: customerAId })).rejects.toThrow(
      /not authorized|super_admin required/i
    );
  });

  it("proves Super Admin can update ticket status and admin notes, setting resolvedAt upon resolution", async () => {
    const ticket = await createTicket({
      authorId: customerAId,
      category: "billing",
      subject: "Receipt inquiry",
      message: "Please send VAT invoice.",
    });

    // 1. Non-admin cannot update ticket status
    await expect(
      updateTicketStatus({
        ticketId: ticket.id,
        callerId: customerAId,
        status: "in_progress",
      })
    ).rejects.toThrow(/not authorized|super_admin required/i);

    // 2. Super Admin transitions ticket to 'in_progress' with notes
    const inProgressTicket = await updateTicketStatus({
      ticketId: ticket.id,
      callerId: adminId,
      status: "in_progress",
      adminNotes: "Contacted finance department for VAT receipt number.",
    });

    expect(inProgressTicket.status).toBe("in_progress");
    expect(inProgressTicket.adminNotes).toBe(
      "Contacted finance department for VAT receipt number."
    );
    expect(inProgressTicket.resolvedAt).toBeNull();

    // 3. Super Admin resolves ticket
    const resolvedTicket = await updateTicketStatus({
      ticketId: ticket.id,
      callerId: adminId,
      status: "resolved",
      adminNotes: "Invoice generated and emailed to user.",
    });

    expect(resolvedTicket.status).toBe("resolved");
    expect(resolvedTicket.resolvedAt).not.toBeNull();
    expect(resolvedTicket.resolvedAt).toBeInstanceOf(Date);

    // 4. Verify audit log entry for status update
    const logs = await listAuditLogs({
      callerId: adminId,
      targetType: "support_ticket",
      action: "ticket.status_updated",
    });
    const updateLog = logs.find((l) => l.targetId === ticket.id);
    expect(updateLog).toBeDefined();
    expect(updateLog?.actorId).toBe(adminId);
    expect(updateLog?.metadata).toMatchObject({
      status: "resolved",
    });
  });
});
