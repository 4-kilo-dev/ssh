/**
 * Phase 6 — Mini-Task 6.2: Venue Inquiry API Routes Integration Tests
 *
 * Requirements from docs/phases.md:
 * 1. POST /api/inquiries:
 *    - Authenticated customer initiates inquiry conversation.
 *    - Rejects unauthenticated callers with 401 Unauthorized.
 *    - Rejects empty initial message with 400 Bad Request.
 * 2. GET /api/inquiries:
 *    - Returns role-scoped conversation list (customers see theirs; managers see theirs).
 * 3. GET /api/inquiries/[id]:
 *    - Returns conversation and message transcript for participating customer & manager.
 *    - Super admin visibility: returns conversation metadata, but private message contents are omitted.
 *    - Rejects foreign accounts with 403 Forbidden.
 * 4. POST /api/inquiries/[id]/messages:
 *    - Participants send replies (201 Created).
 *    - Rejects foreign accounts with 403 Forbidden.
 *    - Rejects empty/blank message content with 400 Bad Request.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createSession, SESSION_COOKIE_NAME } from "../../lib/auth/session";
import {
  GET as listInquiriesRoute,
  POST as createInquiryRoute,
} from "../../app/api/inquiries/route";
import { GET as getInquiryRoute } from "../../app/api/inquiries/[id]/route";
import { POST as sendMessageRoute } from "../../app/api/inquiries/[id]/messages/route";

describe("Phase 6 — Mini-Task 6.2: Venue Inquiry API Routes", () => {
  let testDb: TestDbInstance;
  let customerAId: string;
  let customerBId: string;
  let managerAId: string;
  let managerBId: string;
  let adminId: string;
  let sessionTokenCustA: string;
  let sessionTokenCustB: string;
  let sessionTokenMgrA: string;
  let sessionTokenMgrB: string;
  let sessionTokenAdmin: string;
  let venueAId: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();

    // Accounts
    const custA = await createAccount({
      phone: "+251918000001",
      name: "Customer Hanna",
      role: "user",
    });
    customerAId = custA.id;
    const sessCustA = await createSession(custA.id);
    sessionTokenCustA = sessCustA.sessionToken;

    const custB = await createAccount({
      phone: "+251918000002",
      name: "Customer Henok",
      role: "user",
    });
    customerBId = custB.id;
    const sessCustB = await createSession(custB.id);
    sessionTokenCustB = sessCustB.sessionToken;

    const mgrA = await createAccount({
      phone: "+251918000003",
      name: "Manager Helen",
      role: "venue_manager",
    });
    managerAId = mgrA.id;
    const sessMgrA = await createSession(mgrA.id);
    sessionTokenMgrA = sessMgrA.sessionToken;

    const mgrB = await createAccount({
      phone: "+251918000004",
      name: "Manager Habtamu",
      role: "venue_manager",
    });
    managerBId = mgrB.id;
    const sessMgrB = await createSession(mgrB.id);
    sessionTokenMgrB = sessMgrB.sessionToken;

    const admin = await createAccount({
      phone: "+251918000000",
      name: "Super Admin Robel",
      role: "super_admin",
    });
    adminId = admin.id;
    const sessAdmin = await createSession(admin.id);
    sessionTokenAdmin = sessAdmin.sessionToken;

    // Venue
    const venue = await createVenue({
      managerId: managerAId,
      name: "Helen Sky Ballroom",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueAId = venue.id;
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

  it("proves POST /api/inquiries rejects unauthenticated callers with 401 Unauthorized", async () => {
    const req = new Request("http://localhost:3000/api/inquiries", {
      method: "POST",
      headers: makeHeaders(),
      body: JSON.stringify({
        venueId: venueAId,
        subject: "Catering question",
        initialMessage: "Do you offer vegetarian menus?",
      }),
    });

    const res = await createInquiryRoute(req);
    expect(res.status).toBe(401);
  });

  it("proves POST /api/inquiries creates a conversation and returns 201 Created", async () => {
    const req = new Request("http://localhost:3000/api/inquiries", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustA),
      body: JSON.stringify({
        venueId: venueAId,
        subject: "Sound equipment inquiry",
        initialMessage: "Can our wedding live band connect to your house mixer?",
      }),
    });

    const res = await createInquiryRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.id).toBeDefined();
    expect(body.venueId).toBe(venueAId);
    expect(body.customerId).toBe(customerAId);
    expect(body.managerId).toBe(managerAId);
    expect(body.subject).toBe("Sound equipment inquiry");
  });

  it("proves POST /api/inquiries rejects empty initial message with 400 Bad Request", async () => {
    const req = new Request("http://localhost:3000/api/inquiries", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustA),
      body: JSON.stringify({
        venueId: venueAId,
        subject: "Empty message test",
        initialMessage: "   ",
      }),
    });

    const res = await createInquiryRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty|blank/i);
  });

  it("proves GET /api/inquiries returns scoped conversations for customer and manager", async () => {
    // 1. Customer A lists conversations
    const reqCust = new Request("http://localhost:3000/api/inquiries", {
      headers: makeHeaders(sessionTokenCustA),
    });
    const resCust = await listInquiriesRoute(reqCust);
    expect(resCust.status).toBe(200);
    const bodyCust = await resCust.json();
    expect(Array.isArray(bodyCust)).toBe(true);
    expect(bodyCust.length).toBeGreaterThanOrEqual(1);
    expect(bodyCust[0].customerId).toBe(customerAId);

    // 2. Manager A lists conversations
    const reqMgr = new Request("http://localhost:3000/api/inquiries", {
      headers: makeHeaders(sessionTokenMgrA),
    });
    const resMgr = await listInquiriesRoute(reqMgr);
    expect(resMgr.status).toBe(200);
    const bodyMgr = await resMgr.json();
    expect(Array.isArray(bodyMgr)).toBe(true);
    expect(bodyMgr.length).toBeGreaterThanOrEqual(1);
    expect(bodyMgr[0].managerId).toBe(managerAId);

    // 3. Unrelated customer B sees 0 conversations
    const reqCustB = new Request("http://localhost:3000/api/inquiries", {
      headers: makeHeaders(sessionTokenCustB),
    });
    const resCustB = await listInquiriesRoute(reqCustB);
    const bodyCustB = await resCustB.json();
    expect(bodyCustB).toHaveLength(0);
  });

  it("proves POST /api/inquiries/[id]/messages allows participants to reply, rejects foreign users with 403", async () => {
    // 1. Create a conversation
    const createReq = new Request("http://localhost:3000/api/inquiries", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustA),
      body: JSON.stringify({
        venueId: venueAId,
        subject: "Projector screen question",
        initialMessage: "Do you have HDMI inputs near the podium?",
      }),
    });
    const createRes = await createInquiryRoute(createReq);
    const conv = await createRes.json();

    // 2. Foreign customer B attempts to reply -> 403 Forbidden
    const intrudeReq = new Request(
      `http://localhost:3000/api/inquiries/${conv.id}/messages`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenCustB),
        body: JSON.stringify({ content: "Intruder message" }),
      }
    );
    const intrudeRes = await sendMessageRoute(intrudeReq, {
      params: Promise.resolve({ id: conv.id }),
    });
    expect(intrudeRes.status).toBe(403);

    // 3. Manager A replies -> 201 Created
    const replyReq = new Request(
      `http://localhost:3000/api/inquiries/${conv.id}/messages`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenMgrA),
        body: JSON.stringify({ content: "Yes, we have both HDMI and USB-C inputs at the podium." }),
      }
    );
    const replyRes = await sendMessageRoute(replyReq, {
      params: Promise.resolve({ id: conv.id }),
    });
    expect(replyRes.status).toBe(201);
    const msg = await replyRes.json();
    expect(msg.content).toContain("both HDMI and USB-C");
    expect(msg.senderId).toBe(managerAId);
  });

  it("proves GET /api/inquiries/[id] returns transcript for participants, but excludes private messages for super admin", async () => {
    // 1. Create conversation with initial message
    const createReq = new Request("http://localhost:3000/api/inquiries", {
      method: "POST",
      headers: makeHeaders(sessionTokenCustA),
      body: JSON.stringify({
        venueId: venueAId,
        subject: "Security deposit question",
        initialMessage: "Is the security deposit refundable within 48 hours?",
      }),
    });
    const createRes = await createInquiryRoute(createReq);
    const conv = await createRes.json();

    // 2. Customer A views conversation -> 200 with messages
    const viewCustReq = new Request(`http://localhost:3000/api/inquiries/${conv.id}`, {
      headers: makeHeaders(sessionTokenCustA),
    });
    const viewCustRes = await getInquiryRoute(viewCustReq, {
      params: Promise.resolve({ id: conv.id }),
    });
    expect(viewCustRes.status).toBe(200);
    const custData = await viewCustRes.json();
    expect(custData.conversation.id).toBe(conv.id);
    expect(custData.messages).toHaveLength(1);
    expect(custData.messages[0].content).toContain("security deposit refundable");

    // 3. Manager A views conversation -> 200 with messages
    const viewMgrReq = new Request(`http://localhost:3000/api/inquiries/${conv.id}`, {
      headers: makeHeaders(sessionTokenMgrA),
    });
    const viewMgrRes = await getInquiryRoute(viewMgrReq, {
      params: Promise.resolve({ id: conv.id }),
    });
    expect(viewMgrRes.status).toBe(200);
    const mgrData = await viewMgrRes.json();
    expect(mgrData.messages).toHaveLength(1);

    // 4. Super Admin views conversation -> 200 with metadata, but messages array is empty/omitted (privacy invariant)
    const viewAdminReq = new Request(`http://localhost:3000/api/inquiries/${conv.id}`, {
      headers: makeHeaders(sessionTokenAdmin),
    });
    const viewAdminRes = await getInquiryRoute(viewAdminReq, {
      params: Promise.resolve({ id: conv.id }),
    });
    expect(viewAdminRes.status).toBe(200);
    const adminData = await viewAdminRes.json();
    expect(adminData.conversation.id).toBe(conv.id);
    expect(adminData.messages).toHaveLength(0); // Private messages excluded from super admin!

    // 5. Foreign manager B gets 403 Forbidden
    const viewForeignReq = new Request(`http://localhost:3000/api/inquiries/${conv.id}`, {
      headers: makeHeaders(sessionTokenMgrB),
    });
    const viewForeignRes = await getInquiryRoute(viewForeignReq, {
      params: Promise.resolve({ id: conv.id }),
    });
    expect(viewForeignRes.status).toBe(403);
  });
});
