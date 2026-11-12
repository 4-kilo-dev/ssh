/**
 * Phase 7 — Mini-Task 7.3: Super Admin REST API Routes & Privacy Invariant Tests
 *
 * Requirements from docs/phases.md:
 * 1. GET /api/admin/audit-logs:
 *    - Restricted strictly to `super_admin`. Returns 401 unauthenticated, 403 for manager/customer.
 *    - Allows filtering by `targetType`, `action`, `actorId`.
 * 2. GET /api/admin/overview:
 *    - Restricted to `super_admin`.
 *    - Provides aggregate platform counts (venues, halls, bookings, tickets, audit logs).
 * 3. Support Tickets API:
 *    - POST /api/support/tickets: authenticated intake (returns 201).
 *    - GET /api/support/tickets: authors see their own; super_admin sees all.
 *    - GET /api/support/tickets/[id]: scoped detail (403 for foreign users).
 *    - PATCH /api/support/tickets/[id]: super_admin only status update & resolution.
 * 4. Admin Privacy Invariant:
 *    - Admin read-everything-except-private-messages invariant:
 *      super_admin can view inquiry thread metadata (who spoke with which venue)
 *      but private message bodies are excluded from general admin inspection.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createSession, SESSION_COOKIE_NAME } from "../../lib/auth/session";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import { createBooking } from "../../lib/services/booking-service";
import { createConversation, sendMessage } from "../../lib/services/inquiry-service";
import { createTicket } from "../../lib/services/ticket-service";
import { GET as getAuditLogsRoute } from "../../app/api/admin/audit-logs/route";
import { GET as getOverviewRoute } from "../../app/api/admin/overview/route";
import {
  POST as createTicketRoute,
  GET as listTicketsRoute,
} from "../../app/api/support/tickets/route";
import {
  GET as getTicketRoute,
  PATCH as patchTicketRoute,
} from "../../app/api/support/tickets/[id]/route";
import { NextRequest } from "next/server";

function createMockRequest(
  url: string,
  method: string,
  sessionToken?: string,
  body?: any
): NextRequest {
  const headers = new Headers();
  if (sessionToken) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
  }
  if (body) {
    headers.set("content-type", "application/json");
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Phase 7 — Mini-Task 7.3: Super Admin REST API Routes", () => {
  let adminId: string;
  let adminToken: string;
  let managerId: string;
  let managerToken: string;
  let customerId: string;
  let customerToken: string;
  let venueId: string;
  let hallId: string;

  beforeEach(async () => {
    await setupTestDatabase();

    // 1. Super Admin
    const admin = await createAccount({
      phone: "+251911000000",
      name: "Global Super Admin",
      role: "super_admin",
    });
    adminId = admin.id;
    const adminSession = await createSession(adminId);
    adminToken = adminSession.sessionToken;

    // 2. Venue Manager
    const manager = await createAccount({
      phone: "+251911000001",
      name: "Bole Manager",
      role: "venue_manager",
    });
    managerId = manager.id;
    const managerSession = await createSession(managerId);
    managerToken = managerSession.sessionToken;

    // 3. Customer
    const customer = await createAccount({
      phone: "+251911000002",
      name: "Event Customer",
      role: "user",
    });
    customerId = customer.id;
    const customerSession = await createSession(customerId);
    customerToken = customerSession.sessionToken;

    // 4. Venue & Hall
    const venue = await createVenue({
      managerId,
      name: "Skylight Pavilion",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueId = venue.id;

    const hall = await createHall(managerId, {
      venueId,
      name: "Main Ballroom",
      capacity: 500,
      setting: "indoor",
    });
    hallId = hall.id;
  });

  it("GET /api/admin/audit-logs enforces 401 unauthenticated and 403 for non-admin", async () => {
    // 1. Unauthenticated request -> 401
    const unauthReq = createMockRequest("http://localhost:3000/api/admin/audit-logs", "GET");
    const unauthRes = await getAuditLogsRoute(unauthReq);
    expect(unauthRes.status).toBe(401);

    // 2. Customer request -> 403
    const custReq = createMockRequest(
      "http://localhost:3000/api/admin/audit-logs",
      "GET",
      customerToken
    );
    const custRes = await getAuditLogsRoute(custReq);
    expect(custRes.status).toBe(403);

    // 3. Manager request -> 403
    const mgrReq = createMockRequest(
      "http://localhost:3000/api/admin/audit-logs",
      "GET",
      managerToken
    );
    const mgrRes = await getAuditLogsRoute(mgrReq);
    expect(mgrRes.status).toBe(403);

    // 4. Super Admin request -> 200
    const adminReq = createMockRequest(
      "http://localhost:3000/api/admin/audit-logs",
      "GET",
      adminToken
    );
    const adminRes = await getAuditLogsRoute(adminReq);
    expect(adminRes.status).toBe(200);
    const body = await adminRes.json();
    expect(body.auditLogs).toBeInstanceOf(Array);
  });

  it("GET /api/admin/overview returns aggregated platform KPIs for super_admin", async () => {
    // Create a booking
    await createBooking({
      venueId,
      customerId,
      hallIds: [hallId],
      startTime: new Date("2026-12-30T10:00:00Z"),
      endTime: new Date("2026-12-30T16:00:00Z"),
      guestCount: 300,
    });

    // Create a support ticket
    await createTicket({
      authorId: customerId,
      category: "billing",
      subject: "Tax question",
      message: "Is VAT included?",
    });

    const req = createMockRequest("http://localhost:3000/api/admin/overview", "GET", adminToken);
    const res = await getOverviewRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.overview).toMatchObject({
      venuesCount: 1,
      hallsCount: 1,
      bookingsCount: 1,
      ticketsCount: 1,
    });
    expect(data.overview.auditLogsCount).toBeGreaterThan(0);
    expect(data.overview.bookingsByStatus).toBeDefined();
    expect(data.overview.ticketsByStatus).toBeDefined();
  });

  it("POST /api/support/tickets accepts ticket intake from authenticated users", async () => {
    const req = createMockRequest("http://localhost:3000/api/support/tickets", "POST", customerToken, {
      category: "booking_inquiry",
      subject: "Question about stage sound system",
      message: "Do you supply wireless microphones?",
    });

    const res = await createTicketRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ticket).toBeDefined();
    expect(body.ticket.subject).toBe("Question about stage sound system");
    expect(body.ticket.status).toBe("open");
  });

  it("GET /api/support/tickets routes caller's tickets or all tickets for super_admin", async () => {
    // Ticket 1: Customer
    const t1 = await createTicket({
      authorId: customerId,
      category: "feedback",
      subject: "Great experience",
      message: "Booking was smooth.",
    });

    // Ticket 2: Manager
    await createTicket({
      authorId: managerId,
      category: "payout",
      subject: "Payout inquiry",
      message: "When does weekly settlement process?",
    });

    // Customer query -> returns only 1 ticket
    const custReq = createMockRequest("http://localhost:3000/api/support/tickets", "GET", customerToken);
    const custRes = await listTicketsRoute(custReq);
    expect(custRes.status).toBe(200);
    const custBody = await custRes.json();
    expect(custBody.tickets.length).toBe(1);
    expect(custBody.tickets[0].id).toBe(t1.id);

    // Super Admin query -> returns both tickets
    const adminReq = createMockRequest("http://localhost:3000/api/support/tickets", "GET", adminToken);
    const adminRes = await listTicketsRoute(adminReq);
    expect(adminRes.status).toBe(200);
    const adminBody = await adminRes.json();
    expect(adminBody.tickets.length).toBe(2);
  });

  it("PATCH /api/support/tickets/[id] allows super_admin to update status and rejects non-admin", async () => {
    const ticket = await createTicket({
      authorId: customerId,
      category: "technical",
      subject: "Login issue",
      message: "Could not receive Telegram code.",
    });

    // Customer attempt to patch -> 403
    const custReq = createMockRequest(
      `http://localhost:3000/api/support/tickets/${ticket.id}`,
      "PATCH",
      customerToken,
      { status: "resolved" }
    );
    const custRes = await patchTicketRoute(custReq, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(custRes.status).toBe(403);

    // Super Admin updates to in_progress
    const adminReq = createMockRequest(
      `http://localhost:3000/api/support/tickets/${ticket.id}`,
      "PATCH",
      adminToken,
      { status: "in_progress", adminNotes: "Investigating SMS gateway" }
    );
    const adminRes = await patchTicketRoute(adminReq, {
      params: Promise.resolve({ id: ticket.id }),
    });
    expect(adminRes.status).toBe(200);
    const body = await adminRes.json();
    expect(body.ticket.status).toBe("in_progress");
    expect(body.ticket.adminNotes).toBe("Investigating SMS gateway");
  });

  it("proves Admin privacy invariant: private message contents are strictly excluded from admin audit", async () => {
    // Customer and manager converse privately
    const convo = await createConversation({
      venueId,
      customerId,
      subject: "Off-record VIP price negotiation",
      initialMessage: "Inquiring about venue package options",
    });

    await sendMessage({
      conversationId: convo.id,
      senderId: customerId,
      content: "Can you offer 20% discount if we pay cash in advance?",
    });

    // Super Admin checks audit logs
    const adminReq = createMockRequest(
      "http://localhost:3000/api/admin/audit-logs",
      "GET",
      adminToken
    );
    const adminRes = await getAuditLogsRoute(adminReq);
    expect(adminRes.status).toBe(200);
    const body = await adminRes.json();

    // Verify private message contents NEVER leak into audit logs
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("Can you offer 20% discount if we pay cash in advance?");
  });
});
