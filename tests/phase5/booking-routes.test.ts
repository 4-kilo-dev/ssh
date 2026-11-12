/**
 * Phase 5 — Mini-Task 5.2: Booking Lifecycle API Routes Integration Tests
 *
 * Requirements from docs/phases.md:
 * 1. POST /api/bookings:
 *    - Authenticated customer creates a booking across 1..N halls.
 *    - Rejects unauthenticated callers with 401 Unauthorized.
 *    - Rejects overlapping/conflicted bookings with 409 Conflict.
 * 2. GET /api/bookings:
 *    - Scoped list: returns customer's bookings for users, or venue's bookings for managers.
 * 3. GET /api/bookings/[id]:
 *    - Accessible by customer or venue manager.
 *    - Returns 403 Forbidden to unrelated accounts.
 * 4. POST /api/bookings/[id]/confirm:
 *    - Venue manager re-verifies and confirms booking.
 *    - 403 Forbidden for foreign managers or non-managers.
 *    - 400 Bad Request if booking is already cancelled.
 * 5. POST /api/bookings/[id]/cancel:
 *    - Allows customer or owning manager to cancel.
 *    - Atomically frees slot claims.
 *    - 403 Forbidden for unauthorized callers.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import { createSession, SESSION_COOKIE_NAME } from "../../lib/auth/session";
import {
  GET as listBookingsRoute,
  POST as createBookingRoute,
} from "../../app/api/bookings/route";
import { GET as getBookingRoute } from "../../app/api/bookings/[id]/route";
import { POST as confirmBookingRoute } from "../../app/api/bookings/[id]/confirm/route";
import { POST as cancelBookingRoute } from "../../app/api/bookings/[id]/cancel/route";

describe("Phase 5 — Mini-Task 5.2: Booking Lifecycle API Routes", () => {
  let testDb: TestDbInstance;
  let customerAId: string;
  let customerBId: string;
  let managerAId: string;
  let managerBId: string;
  let sessionTokenCustA: string;
  let sessionTokenCustB: string;
  let sessionTokenMgrA: string;
  let sessionTokenMgrB: string;
  let venueAId: string;
  let hallA1Id: string;
  let hallA2Id: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();

    // Accounts
    const custA = await createAccount({
      phone: "+251916000001",
      name: "Customer Abebe",
      role: "user",
    });
    customerAId = custA.id;
    const sessCustA = await createSession(custA.id);
    sessionTokenCustA = sessCustA.sessionToken;

    const custB = await createAccount({
      phone: "+251916000002",
      name: "Customer Betty",
      role: "user",
    });
    customerBId = custB.id;
    const sessCustB = await createSession(custB.id);
    sessionTokenCustB = sessCustB.sessionToken;

    const mgrA = await createAccount({
      phone: "+251916000003",
      name: "Manager Chala",
      role: "venue_manager",
    });
    managerAId = mgrA.id;
    const sessMgrA = await createSession(mgrA.id);
    sessionTokenMgrA = sessMgrA.sessionToken;

    const mgrB = await createAccount({
      phone: "+251916000004",
      name: "Manager Desta",
      role: "venue_manager",
    });
    managerBId = mgrB.id;
    const sessMgrB = await createSession(mgrB.id);
    sessionTokenMgrB = sessMgrB.sessionToken;

    // Venue & Halls
    const venueA = await createVenue({
      managerId: managerAId,
      name: "Chala Sky Pavilion",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueAId = venueA.id;

    const hall1 = await createHall(managerAId, {
      venueId: venueAId,
      name: "Main Ballroom",
      capacity: 500,
      setting: "indoor",
    });
    hallA1Id = hall1.id;

    const hall2 = await createHall(managerAId, {
      venueId: venueAId,
      name: "Sky Deck",
      capacity: 200,
      setting: "covered-outdoor",
    });
    hallA2Id = hall2.id;
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  function makeHeaders(sessionToken?: string): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionToken) {
      headers.cookie = `${SESSION_COOKIE_NAME}=${sessionToken}`;
    }
    return headers;
  }

  it("proves POST /api/bookings rejects unauthenticated requests with 401 Unauthorized", async () => {
    const req = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: makeHeaders(),
      body: JSON.stringify({
        venueId: venueAId,
        hallIds: [hallA1Id],
        startTime: "2026-12-15T10:00:00Z",
        endTime: "2026-12-15T14:00:00Z",
      }),
    });

    const res = await createBookingRoute(req);
    expect(res.status).toBe(401);
  });

  it("proves POST /api/bookings creates a booking in 'requested' status for authenticated customer", async () => {
    const start = "2026-12-15T10:00:00Z";
    const end = "2026-12-15T14:00:00Z";

    const req = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustA),
      body: JSON.stringify({
        venueId: venueAId,
        hallIds: [hallA1Id, hallA2Id],
        startTime: start,
        endTime: end,
        guestCount: 350,
        notes: "Anniversary celebration",
      }),
    });

    const res = await createBookingRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.id).toBeDefined();
    expect(body.status).toBe("requested");
    expect(body.venueId).toBe(venueAId);
    expect(body.customerId).toBe(customerAId);
    expect(body.halls).toHaveLength(2);
  });

  it("proves POST /api/bookings returns 409 Conflict when attempting an overlapping booking", async () => {
    // Overlaps with 10:00 to 14:00 above (12:00 to 16:00 on hall 1)
    const req = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustB),
      body: JSON.stringify({
        venueId: venueAId,
        hallIds: [hallA1Id],
        startTime: "2026-12-15T12:00:00Z",
        endTime: "2026-12-15T16:00:00Z",
        guestCount: 100,
      }),
    });

    const res = await createBookingRoute(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/conflict|overlap|booked/i);
  });

  it("proves GET /api/bookings returns customer's scoped bookings", async () => {
    const req = new Request("http://localhost:3000/api/bookings", {
      method: "GET",
      headers: makeHeaders(sessionTokenCustA),
    });

    const res = await listBookingsRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].customerId).toBe(customerAId);
  });

  it("proves GET /api/bookings returns venue's scoped bookings when caller is venue manager", async () => {
    const req = new Request("http://localhost:3000/api/bookings", {
      method: "GET",
      headers: makeHeaders(sessionTokenMgrA),
    });

    const res = await listBookingsRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].venueId).toBe(venueAId);
  });

  it("proves GET /api/bookings/[id] allows customer and venue manager, rejects foreign users with 403", async () => {
    // 1. Customer A creates a booking
    const createReq = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustA),
      body: JSON.stringify({
        venueId: venueAId,
        hallIds: [hallA1Id],
        startTime: "2026-12-16T10:00:00Z",
        endTime: "2026-12-16T14:00:00Z",
      }),
    });
    const createRes = await createBookingRoute(createReq);
    const booking = await createRes.json();

    // 2. Customer A (owner) can view
    const viewOwnerReq = new Request(`http://localhost:3000/api/bookings/${booking.id}`, {
      headers: makeHeaders(sessionTokenCustA),
    });
    const viewOwnerRes = await getBookingRoute(viewOwnerReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(viewOwnerRes.status).toBe(200);

    // 3. Manager A (venue owner) can view
    const viewMgrReq = new Request(`http://localhost:3000/api/bookings/${booking.id}`, {
      headers: makeHeaders(sessionTokenMgrA),
    });
    const viewMgrRes = await getBookingRoute(viewMgrReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(viewMgrRes.status).toBe(200);

    // 4. Customer B (unrelated) gets 403 Forbidden
    const viewOtherReq = new Request(`http://localhost:3000/api/bookings/${booking.id}`, {
      headers: makeHeaders(sessionTokenCustB),
    });
    const viewOtherRes = await getBookingRoute(viewOtherReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(viewOtherRes.status).toBe(403);
  });

  it("proves POST /api/bookings/[id]/confirm confirms booking for venue manager, rejects foreign callers with 403", async () => {
    // 1. Create booking
    const createReq = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustA),
      body: JSON.stringify({
        venueId: venueAId,
        hallIds: [hallA1Id],
        startTime: "2026-12-17T10:00:00Z",
        endTime: "2026-12-17T14:00:00Z",
      }),
    });
    const createRes = await createBookingRoute(createReq);
    const booking = await createRes.json();

    // 2. Foreign manager attempts to confirm -> 403 Forbidden
    const foreignReq = new Request(
      `http://localhost:3000/api/bookings/${booking.id}/confirm`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenMgrB),
      }
    );
    const foreignRes = await confirmBookingRoute(foreignReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(foreignRes.status).toBe(403);

    // 3. Customer attempts to confirm -> 403 Forbidden
    const custReq = new Request(
      `http://localhost:3000/api/bookings/${booking.id}/confirm`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenCustA),
      }
    );
    const custRes = await confirmBookingRoute(custReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(custRes.status).toBe(403);

    // 4. Venue Manager A confirms -> 200 OK
    const confirmReq = new Request(
      `http://localhost:3000/api/bookings/${booking.id}/confirm`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenMgrA),
      }
    );
    const confirmRes = await confirmBookingRoute(confirmReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(confirmRes.status).toBe(200);
    const confirmed = await confirmRes.json();
    expect(confirmed.status).toBe("confirmed");
  });

  it("proves POST /api/bookings/[id]/cancel cancels booking, rejects foreign accounts with 403, and rejects re-cancelling", async () => {
    // 1. Create booking
    const createReq = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustA),
      body: JSON.stringify({
        venueId: venueAId,
        hallIds: [hallA1Id],
        startTime: "2026-12-18T10:00:00Z",
        endTime: "2026-12-18T14:00:00Z",
      }),
    });
    const createRes = await createBookingRoute(createReq);
    const booking = await createRes.json();

    // 2. Foreign customer attempts to cancel -> 403
    const foreignReq = new Request(
      `http://localhost:3000/api/bookings/${booking.id}/cancel`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenCustB),
        body: JSON.stringify({ reason: "Malicious cancel" }),
      }
    );
    const foreignRes = await cancelBookingRoute(foreignReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(foreignRes.status).toBe(403);

    // 3. Customer A cancels -> 200 OK
    const cancelReq = new Request(
      `http://localhost:3000/api/bookings/${booking.id}/cancel`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenCustA),
        body: JSON.stringify({ reason: "Plans changed" }),
      }
    );
    const cancelRes = await cancelBookingRoute(cancelReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(cancelRes.status).toBe(200);
    const cancelled = await cancelRes.json();
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellationReason).toBe("Plans changed");

    // 4. Cannot confirm a cancelled booking -> 400 Bad Request
    const tryConfirmReq = new Request(
      `http://localhost:3000/api/bookings/${booking.id}/confirm`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenMgrA),
      }
    );
    const tryConfirmRes = await confirmBookingRoute(tryConfirmReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(tryConfirmRes.status).toBe(400);

    // 5. Re-cancelling returns 400 Bad Request
    const reCancelRes = await cancelBookingRoute(cancelReq, {
      params: Promise.resolve({ id: booking.id }),
    });
    expect(reCancelRes.status).toBe(400);
  });
});
