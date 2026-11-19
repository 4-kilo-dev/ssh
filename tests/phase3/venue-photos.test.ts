import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createSession, SESSION_COOKIE_NAME } from "../../lib/auth/session";
import { createVenue } from "../../lib/services/venue-service";
import {
  POST as uploadVenuePhotoRoute,
  GET as getVenuePhotosRoute,
  DELETE as deleteVenuePhotoRoute,
} from "../../app/api/venues/[id]/photos/route";

describe("Venue Photos API & S3 Storage", () => {
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

  it("proves POST /api/venues/[id]/photos uploads the Bellevue photo and attaches to venue", async () => {
    const manager = await createAccount({
      name: "Bellevue Manager",
      phone: "+251911990001",
      role: "venue_manager",
    });
    const session = await createSession(manager.id);

    const venue = await createVenue({
      managerId: manager.id,
      name: "Bellevue Hotel Test",
      area: "Central Megenagna",
      type: "Hotel ballroom",
    });

    // 1. Unauthenticated upload fails with 401
    const unauthReq = new Request(`http://localhost/api/venues/${venue.id}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset: "bellevue" }),
    });
    const unauthRes = await uploadVenuePhotoRoute(unauthReq, {
      params: Promise.resolve({ id: venue.id }),
    });
    expect(unauthRes.status).toBe(401);

    // 2. Foreign manager upload fails with 403
    const foreignMgr = await createAccount({
      name: "Foreign Manager",
      phone: "+251911990002",
      role: "venue_manager",
    });
    const foreignSession = await createSession(foreignMgr.id);
    const foreignReq = new Request(`http://localhost/api/venues/${venue.id}/photos`, {
      method: "POST",
      headers: makeAuthHeaders(foreignSession.sessionToken),
      body: JSON.stringify({ preset: "bellevue" }),
    });
    const foreignRes = await uploadVenuePhotoRoute(foreignReq, {
      params: Promise.resolve({ id: venue.id }),
    });
    expect(foreignRes.status).toBe(403);

    // 3. Authorized manager uploads the Bellevue picture preset
    const uploadReq = new Request(`http://localhost/api/venues/${venue.id}/photos`, {
      method: "POST",
      headers: makeAuthHeaders(session.sessionToken),
      body: JSON.stringify({ preset: "bellevue" }),
    });
    const uploadRes = await uploadVenuePhotoRoute(uploadReq, {
      params: Promise.resolve({ id: venue.id }),
    });
    expect(uploadRes.status).toBe(201);
    const uploadData = await uploadRes.json();

    expect(uploadData.status).toBe("ok");
    expect(uploadData.photoUrl).toContain("/venues/");
    expect(uploadData.photoUrl).toContain("bellevue-");
    expect(uploadData.photos.length).toBe(1);
    expect(uploadData.photos[0]).toBe(uploadData.photoUrl);

    // 4. GET /api/venues/[id]/photos returns the uploaded photo
    const getReq = new Request(`http://localhost/api/venues/${venue.id}/photos`);
    const getRes = await getVenuePhotosRoute(getReq, {
      params: Promise.resolve({ id: venue.id }),
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.photos).toEqual([uploadData.photoUrl]);

    // 5. DELETE /api/venues/[id]/photos removes the photo
    const deleteReq = new Request(`http://localhost/api/venues/${venue.id}/photos`, {
      method: "DELETE",
      headers: makeAuthHeaders(session.sessionToken),
      body: JSON.stringify({ photoUrl: uploadData.photoUrl }),
    });
    const deleteRes = await deleteVenuePhotoRoute(deleteReq, {
      params: Promise.resolve({ id: venue.id }),
    });
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.photos.length).toBe(0);
  });
});
