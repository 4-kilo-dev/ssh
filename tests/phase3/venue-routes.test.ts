/**
 * Phase 3 — Mini-Task 3.3: Venue & Hall API Routes Integration Tests
 *
 * Tests the HTTP endpoints for venue and hall management:
 * 1. Public browsing: GET /api/venues and GET /api/venues/[id].
 * 2. Manager authentication: POST /api/venues requires venue_manager role.
 * 3. Ownership enforcement: PUT/DELETE /api/venues/[id] and hall operations
 *    strictly reject non-owner managers with 403 Forbidden.
 * 4. Hall CRUD under venue: POST/PUT/DELETE /api/venues/[id]/halls endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createSession, SESSION_COOKIE_NAME } from "../../lib/auth/session";
import { GET as listVenuesRoute, POST as createVenueRoute } from "../../app/api/venues/route";
import {
  GET as getVenueRoute,
  PUT as updateVenueRoute,
  DELETE as deleteVenueRoute,
} from "../../app/api/venues/[id]/route";
import {
  GET as listHallsRoute,
  POST as createHallRoute,
} from "../../app/api/venues/[id]/halls/route";
import {
  PUT as updateHallRoute,
  DELETE as deleteHallRoute,
} from "../../app/api/venues/[id]/halls/[hallId]/route";

describe("Phase 3 — Mini-Task 3.3: Venue & Hall API Routes", () => {
  let testDb: TestDbInstance;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  function makeAuthHeaders(sessionToken: string): HeadersInit {
    return {
      "Content-Type": "application/json",
      cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
    };
  }

  it("proves GET /api/venues returns public list of venues", async () => {
    // Explanation: Anonymous users can browse public venues.
    const manager = await createAccount({
      phone: "+251912000001",
      name: "Public Route Manager",
      role: "venue_manager",
    });
    const session = await createSession(manager.id);

    // Create a venue via POST
    const createReq = new Request("http://localhost:3000/api/venues", {
      method: "POST",
      headers: makeAuthHeaders(session.sessionToken),
      body: JSON.stringify({
        name: "Addis Skylight Grand",
        area: "Bole",
        type: "Hotel ballroom",
        description: "Premier luxury ballroom near the airport.",
        amenities: ["Parking", "Stage", "Wi-Fi"],
      }),
    });
    const createRes = await createVenueRoute(createReq);
    expect(createRes.status).toBe(201);

    // Query public list
    const listReq = new Request("http://localhost:3000/api/venues?area=Bole");
    const listRes = await listVenuesRoute(listReq);
    expect(listRes.status).toBe(200);

    const data = await listRes.json();
    expect(data.venues).toBeDefined();
    expect(data.venues.length).toBeGreaterThanOrEqual(1);
    expect(data.venues.some((v: any) => v.name === "Addis Skylight Grand")).toBe(true);
  });

  it("proves POST /api/venues requires venue_manager role", async () => {
    // Explanation: Regular users cannot create venues (403 Forbidden).
    const regularUser = await createAccount({
      phone: "+251912000002",
      name: "Normal User",
      role: "user",
    });
    const session = await createSession(regularUser.id);

    const req = new Request("http://localhost:3000/api/venues", {
      method: "POST",
      headers: makeAuthHeaders(session.sessionToken),
      body: JSON.stringify({
        name: "Unauthorized Venue",
        area: "Kazanchis",
        type: "Wedding hall",
      }),
    });

    const res = await createVenueRoute(req);
    expect(res.status).toBe(403);
  });

  it("proves POST /api/venues rejects unauthenticated calls", async () => {
    // Explanation: Calls without session cookies return 401 Unauthorized.
    const req = new Request("http://localhost:3000/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "No Auth Venue",
        area: "Piassa",
        type: "Garden venue",
      }),
    });

    const res = await createVenueRoute(req);
    expect(res.status).toBe(401);
  });

  it("proves GET /api/venues/[id] returns venue and its halls", async () => {
    // Explanation: Public endpoint returns venue details together with nested halls.
    const manager = await createAccount({
      phone: "+251912000003",
      name: "Detail Route Manager",
      role: "venue_manager",
    });
    const session = await createSession(manager.id);

    // Create venue
    const createVenueReq = new Request("http://localhost:3000/api/venues", {
      method: "POST",
      headers: makeAuthHeaders(session.sessionToken),
      body: JSON.stringify({
        name: "Harmony Plaza",
        area: "Bole",
        type: "Conference space",
      }),
    });
    const venueRes = await createVenueRoute(createVenueReq);
    const { venue } = await venueRes.json();

    // Create hall under venue
    const createHallReq = new Request(`http://localhost:3000/api/venues/${venue.id}/halls`, {
      method: "POST",
      headers: makeAuthHeaders(session.sessionToken),
      body: JSON.stringify({
        name: "Executive Room A",
        capacity: 45,
        setting: "indoor",
      }),
    });
    const hallRes = await createHallRoute(createHallReq, { params: Promise.resolve({ id: venue.id }) });
    expect(hallRes.status).toBe(201);

    // Fetch detail
    const detailReq = new Request(`http://localhost:3000/api/venues/${venue.id}`);
    const detailRes = await getVenueRoute(detailReq, { params: Promise.resolve({ id: venue.id }) });
    expect(detailRes.status).toBe(200);

    const body = await detailRes.json();
    expect(body.venue.id).toBe(venue.id);
    expect(body.halls).toHaveLength(1);
    expect(body.halls[0].name).toBe("Executive Room A");
  });

  it("proves PUT /api/venues/[id] rejects foreign managers with 403 Forbidden", async () => {
    // Explanation: Manager B cannot modify Manager A's venue.
    const managerA = await createAccount({
      phone: "+251912000004",
      name: "Manager Owner",
      role: "venue_manager",
    });
    const managerB = await createAccount({
      phone: "+251912000005",
      name: "Manager Intruder",
      role: "venue_manager",
    });

    const sessionA = await createSession(managerA.id);
    const sessionB = await createSession(managerB.id);

    const venueRes = await createVenueRoute(
      new Request("http://localhost:3000/api/venues", {
        method: "POST",
        headers: makeAuthHeaders(sessionA.sessionToken),
        body: JSON.stringify({
          name: "Original Sanctuary",
          area: "Sar Bet",
          type: "Garden venue",
        }),
      })
    );
    const { venue } = await venueRes.json();

    // Manager B attempts update
    const updateReq = new Request(`http://localhost:3000/api/venues/${venue.id}`, {
      method: "PUT",
      headers: makeAuthHeaders(sessionB.sessionToken),
      body: JSON.stringify({
        name: "Hacked by B",
      }),
    });
    const updateRes = await updateVenueRoute(updateReq, { params: Promise.resolve({ id: venue.id }) });
    expect(updateRes.status).toBe(403);
  });

  it("proves owner manager can update their venue via PUT /api/venues/[id]", async () => {
    // Explanation: The authorized owner updates venue attributes.
    const manager = await createAccount({
      phone: "+251912000006",
      name: "Manager Update",
      role: "venue_manager",
    });
    const session = await createSession(manager.id);

    const venueRes = await createVenueRoute(
      new Request("http://localhost:3000/api/venues", {
        method: "POST",
        headers: makeAuthHeaders(session.sessionToken),
        body: JSON.stringify({
          name: "Initial Center",
          area: "CMC",
          type: "Wedding hall",
        }),
      })
    );
    const { venue } = await venueRes.json();

    const updateReq = new Request(`http://localhost:3000/api/venues/${venue.id}`, {
      method: "PUT",
      headers: makeAuthHeaders(session.sessionToken),
      body: JSON.stringify({
        description: "Renovated 2026 venue with lush landscaping.",
        policies: "Music permitted till 11 PM.",
      }),
    });
    const updateRes = await updateVenueRoute(updateReq, { params: Promise.resolve({ id: venue.id }) });
    expect(updateRes.status).toBe(200);

    const body = await updateRes.json();
    expect(body.venue.description).toBe("Renovated 2026 venue with lush landscaping.");
    expect(body.venue.policies).toBe("Music permitted till 11 PM.");
  });

  it("proves manager B cannot add, update, or delete halls under manager A's venue", async () => {
    // Explanation: Full hall ownership boundary via API.
    const managerA = await createAccount({
      phone: "+251912000007",
      name: "Legit Manager",
      role: "venue_manager",
    });
    const managerB = await createAccount({
      phone: "+251912000008",
      name: "Foreign Manager",
      role: "venue_manager",
    });

    const sessionA = await createSession(managerA.id);
    const sessionB = await createSession(managerB.id);

    // Create Venue A
    const venueRes = await createVenueRoute(
      new Request("http://localhost:3000/api/venues", {
        method: "POST",
        headers: makeAuthHeaders(sessionA.sessionToken),
        body: JSON.stringify({
          name: "Fortress Venue",
          area: "Old Airport",
          type: "Hotel ballroom",
        }),
      })
    );
    const { venue } = await venueRes.json();

    // Create Hall under Venue A by Manager A
    const hallRes = await createHallRoute(
      new Request(`http://localhost:3000/api/venues/${venue.id}/halls`, {
        method: "POST",
        headers: makeAuthHeaders(sessionA.sessionToken),
        body: JSON.stringify({
          name: "Legit Hall",
          capacity: 100,
          setting: "indoor",
        }),
      }),
      { params: Promise.resolve({ id: venue.id }) }
    );
    const { hall } = await hallRes.json();

    // 1. Manager B tries to add a hall to Venue A -> 403
    const badAddReq = new Request(`http://localhost:3000/api/venues/${venue.id}/halls`, {
      method: "POST",
      headers: makeAuthHeaders(sessionB.sessionToken),
      body: JSON.stringify({
        name: "Unauthorized Hall",
        capacity: 50,
        setting: "indoor",
      }),
    });
    const badAddRes = await createHallRoute(badAddReq, { params: Promise.resolve({ id: venue.id }) });
    expect(badAddRes.status).toBe(403);

    // 2. Manager B tries to update Hall in Venue A -> 403
    const badUpdateReq = new Request(
      `http://localhost:3000/api/venues/${venue.id}/halls/${hall.id}`,
      {
        method: "PUT",
        headers: makeAuthHeaders(sessionB.sessionToken),
        body: JSON.stringify({ capacity: 1 }),
      }
    );
    const badUpdateRes = await updateHallRoute(badUpdateReq, {
      params: Promise.resolve({ id: venue.id, hallId: hall.id }),
    });
    expect(badUpdateRes.status).toBe(403);

    // 3. Manager B tries to delete Hall in Venue A -> 403
    const badDeleteReq = new Request(
      `http://localhost:3000/api/venues/${venue.id}/halls/${hall.id}`,
      {
        method: "DELETE",
        headers: makeAuthHeaders(sessionB.sessionToken),
      }
    );
    const badDeleteRes = await deleteHallRoute(badDeleteReq, {
      params: Promise.resolve({ id: venue.id, hallId: hall.id }),
    });
    expect(badDeleteRes.status).toBe(403);
  });

  it("proves owner manager can delete their hall and venue", async () => {
    // Explanation: Full deletion lifecycle for authorized owner.
    const manager = await createAccount({
      phone: "+251912000009",
      name: "TearDown Manager",
      role: "venue_manager",
    });
    const session = await createSession(manager.id);

    const venueRes = await createVenueRoute(
      new Request("http://localhost:3000/api/venues", {
        method: "POST",
        headers: makeAuthHeaders(session.sessionToken),
        body: JSON.stringify({
          name: "Temporary Hall Spot",
          area: "Mexico",
          type: "Wedding hall",
        }),
      })
    );
    const { venue } = await venueRes.json();

    const hallRes = await createHallRoute(
      new Request(`http://localhost:3000/api/venues/${venue.id}/halls`, {
        method: "POST",
        headers: makeAuthHeaders(session.sessionToken),
        body: JSON.stringify({
          name: "Temporary Hall",
          capacity: 50,
          setting: "indoor",
        }),
      }),
      { params: Promise.resolve({ id: venue.id }) }
    );
    const { hall } = await hallRes.json();

    // Owner deletes hall
    const delHallRes = await deleteHallRoute(
      new Request(`http://localhost:3000/api/venues/${venue.id}/halls/${hall.id}`, {
        method: "DELETE",
        headers: makeAuthHeaders(session.sessionToken),
      }),
      { params: Promise.resolve({ id: venue.id, hallId: hall.id }) }
    );
    expect(delHallRes.status).toBe(200);

    // Verify hall list is empty
    const listHallsRes = await listHallsRoute(
      new Request(`http://localhost:3000/api/venues/${venue.id}/halls`),
      { params: Promise.resolve({ id: venue.id }) }
    );
    const hallsData = await listHallsRes.json();
    expect(hallsData.halls).toHaveLength(0);

    // Owner deletes venue
    const delVenueRes = await deleteVenueRoute(
      new Request(`http://localhost:3000/api/venues/${venue.id}`, {
        method: "DELETE",
        headers: makeAuthHeaders(session.sessionToken),
      }),
      { params: Promise.resolve({ id: venue.id }) }
    );
    expect(delVenueRes.status).toBe(200);

    // Venue GET should now return 404
    const checkVenue = await getVenueRoute(
      new Request(`http://localhost:3000/api/venues/${venue.id}`),
      { params: Promise.resolve({ id: venue.id }) }
    );
    expect(checkVenue.status).toBe(404);
  });
});
