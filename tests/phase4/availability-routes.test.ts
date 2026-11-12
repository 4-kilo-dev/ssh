/**
 * Phase 4 — Mini-Task 4.3: Availability & SlotBlock API Routes Integration Tests
 *
 * Requirements:
 * 1. GET /api/venues/[id]/halls/[hallId]/availability:
 *    - Query with date=YYYY-MM-DD returns hourly schedule.
 *    - Query with startTime and endTime returns derived availability boolean and any conflict.
 * 2. POST /api/venues/[id]/halls/[hallId]/blocks:
 *    - Creates an off-platform manual SlotBlock.
 *    - Requires authenticated venue_manager owning the venue (403 for non-owners).
 *    - Rejects overlapping blocks with 409 Conflict.
 * 3. DELETE /api/venues/[id]/halls/[hallId]/blocks/[blockId]:
 *    - Releases the block, returning 200 and restoring derived availability.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import { createSession, SESSION_COOKIE_NAME } from "../../lib/auth/session";
import { GET as getAvailabilityRoute } from "../../app/api/venues/[id]/halls/[hallId]/availability/route";
import {
  GET as listBlocksRoute,
  POST as createBlockRoute,
} from "../../app/api/venues/[id]/halls/[hallId]/blocks/route";
import { DELETE as deleteBlockRoute } from "../../app/api/venues/[id]/halls/[hallId]/blocks/[blockId]/route";

describe("Phase 4 — Mini-Task 4.3: Availability & SlotBlock API Routes", () => {
  let testDb: TestDbInstance;
  let managerAId: string;
  let managerBId: string;
  let sessionTokenA: string;
  let sessionTokenB: string;
  let venueId: string;
  let hallId: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();

    const managerA = await createAccount({
      phone: "+251914200001",
      name: "Route Manager Alice",
      role: "venue_manager",
    });
    managerAId = managerA.id;
    const sessionA = await createSession(managerA.id);
    sessionTokenA = sessionA.sessionToken;

    const managerB = await createAccount({
      phone: "+251914200002",
      name: "Route Manager Bob",
      role: "venue_manager",
    });
    managerBId = managerB.id;
    const sessionB = await createSession(managerB.id);
    sessionTokenB = sessionB.sessionToken;

    const venue = await createVenue({
      managerId: managerAId,
      name: "Starlight Ballroom & Garden",
      area: "Bole",
      type: "Hotel ballroom",
    });
    venueId = venue.id;

    const hall = await createHall(managerAId, {
      venueId,
      name: "Crystal Ballroom",
      capacity: 400,
      setting: "indoor",
    });
    hallId = hall.id;
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

  it("proves GET availability returns available: true when no claims exist", async () => {
    // Query window 10:00 to 14:00
    const start = "2026-12-20T10:00:00.000Z";
    const end = "2026-12-20T14:00:00.000Z";

    const req = new Request(
      `http://localhost:3000/api/venues/${venueId}/halls/${hallId}/availability?startTime=${start}&endTime=${end}`
    );
    const res = await getAvailabilityRoute(req, {
      params: Promise.resolve({ id: venueId, hallId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.conflict).toBeNull();
  });

  it("proves POST blocks allows owner manager to block off-platform slot and flips availability", async () => {
    // Owner blocks 12:00 to 18:00
    const start = "2026-12-20T12:00:00.000Z";
    const end = "2026-12-20T18:00:00.000Z";

    const blockReq = new Request(
      `http://localhost:3000/api/venues/${venueId}/halls/${hallId}/blocks`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenA),
        body: JSON.stringify({
          startTime: start,
          endTime: end,
          reason: "Off-platform wedding reception",
        }),
      }
    );
    const blockRes = await createBlockRoute(blockReq, {
      params: Promise.resolve({ id: venueId, hallId }),
    });

    expect(blockRes.status).toBe(201);
    const blockBody = await blockRes.json();
    expect(blockBody.block.id).toBeDefined();
    expect(blockBody.block.reason).toBe("Off-platform wedding reception");

    // Check availability for 14:00 to 16:00 -> should now be available: false
    const checkReq = new Request(
      `http://localhost:3000/api/venues/${venueId}/halls/${hallId}/availability?startTime=2026-12-20T14:00:00.000Z&endTime=2026-12-20T16:00:00.000Z`
    );
    const checkRes = await getAvailabilityRoute(checkReq, {
      params: Promise.resolve({ id: venueId, hallId }),
    });

    expect(checkRes.status).toBe(200);
    const checkBody = await checkRes.json();
    expect(checkBody.available).toBe(false);
    expect(checkBody.conflict.reason).toBe("Off-platform wedding reception");
  });

  it("proves POST blocks rejects overlapping slot with 409 Conflict", async () => {
    // Try to block 15:00 to 20:00 (overlaps existing 12:00 - 18:00)
    const blockReq = new Request(
      `http://localhost:3000/api/venues/${venueId}/halls/${hallId}/blocks`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenA),
        body: JSON.stringify({
          startTime: "2026-12-20T15:00:00.000Z",
          endTime: "2026-12-20T20:00:00.000Z",
          reason: "Colliding block",
        }),
      }
    );
    const blockRes = await createBlockRoute(blockReq, {
      params: Promise.resolve({ id: venueId, hallId }),
    });

    expect(blockRes.status).toBe(409);
    const body = await blockRes.json();
    expect(body.error).toMatch(/double-booking|overlapping|exclusion/i);
  });

  it("proves POST blocks rejects foreign manager with 403 Forbidden", async () => {
    // Manager B tries to block Manager A's hall
    const badReq = new Request(
      `http://localhost:3000/api/venues/${venueId}/halls/${hallId}/blocks`,
      {
        method: "POST",
        headers: makeHeaders(sessionTokenB),
        body: JSON.stringify({
          startTime: "2026-12-21T10:00:00.000Z",
          endTime: "2026-12-21T14:00:00.000Z",
          reason: "Intruder attempt",
        }),
      }
    );
    const badRes = await createBlockRoute(badReq, {
      params: Promise.resolve({ id: venueId, hallId }),
    });

    expect(badRes.status).toBe(403);
  });

  it("proves DELETE blocks releases the slot and restores available: true", async () => {
    // Create fresh block for 2026-12-22
    const start = "2026-12-22T10:00:00.000Z";
    const end = "2026-12-22T15:00:00.000Z";

    const createRes = await createBlockRoute(
      new Request(`http://localhost:3000/api/venues/${venueId}/halls/${hallId}/blocks`, {
        method: "POST",
        headers: makeHeaders(sessionTokenA),
        body: JSON.stringify({
          startTime: start,
          endTime: end,
          reason: "Temporary maintenance",
        }),
      }),
      { params: Promise.resolve({ id: venueId, hallId }) }
    );
    const { block } = await createRes.json();

    // Release block via DELETE
    const delRes = await deleteBlockRoute(
      new Request(
        `http://localhost:3000/api/venues/${venueId}/halls/${hallId}/blocks/${block.id}`,
        {
          method: "DELETE",
          headers: makeHeaders(sessionTokenA),
        }
      ),
      { params: Promise.resolve({ id: venueId, hallId, blockId: block.id }) }
    );
    expect(delRes.status).toBe(200);

    // Verify availability restored
    const checkRes = await getAvailabilityRoute(
      new Request(
        `http://localhost:3000/api/venues/${venueId}/halls/${hallId}/availability?startTime=${start}&endTime=${end}`
      ),
      { params: Promise.resolve({ id: venueId, hallId }) }
    );
    const checkBody = await checkRes.json();
    expect(checkBody.available).toBe(true);
  });

  it("proves GET availability with date returns hourly timeline breakdown", async () => {
    const req = new Request(
      `http://localhost:3000/api/venues/${venueId}/halls/${hallId}/availability?date=2026-12-20`
    );
    const res = await getAvailabilityRoute(req, {
      params: Promise.resolve({ id: venueId, hallId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.timeline).toBeDefined();
    expect(body.timeline.date).toBe("2026-12-20");
    expect(body.timeline.slots.length).toBeGreaterThan(0);
  });
});
