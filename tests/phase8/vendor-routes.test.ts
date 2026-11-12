/**
 * Phase 8 — Mini-Task 8.3: Vendor REST API Routes Tests
 *
 * Requirements from docs/phases.md:
 * 1. POST /api/vendors:
 *    - Allows accounts with role 'vendor' or 'super_admin' to register a vendor profile (201).
 *    - Rejects unauthenticated callers (401) or standard users (403).
 * 2. GET /api/vendors:
 *    - Public endpoint returning deterministically ranked vendors (boosted first, then verified).
 *    - Supports query parameters: category, area, verified.
 * 3. GET /api/vendors/[id]:
 *    - Public vendor detail.
 * 4. PATCH /api/vendors/[id]:
 *    - Updates vendor details. Restricted to vendor owner or super_admin (403 for others).
 * 5. POST /api/vendors/[id]/boost:
 *    - Toggles or updates boost status and score. Allowed for owner or super_admin.
 * 6. POST /api/vendors/[id]/verify:
 *    - Restricted strictly to super_admin. Rejects vendor owner or standard user with 403.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createSession, SESSION_COOKIE_NAME } from "../../lib/auth/session";
import { createVendor, setVendorBoost } from "../../lib/services/vendor-service";
import {
  POST as createVendorRoute,
  GET as listVendorsRoute,
} from "../../app/api/vendors/route";
import {
  GET as getVendorRoute,
  PATCH as patchVendorRoute,
} from "../../app/api/vendors/[id]/route";
import { POST as boostVendorRoute } from "../../app/api/vendors/[id]/boost/route";
import { POST as verifyVendorRoute } from "../../app/api/vendors/[id]/verify/route";
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

describe("Phase 8 — Mini-Task 8.3: Vendor REST API Routes", () => {
  let adminId: string;
  let adminToken: string;
  let vendorOwnerAId: string;
  let vendorOwnerAToken: string;
  let vendorOwnerBId: string;
  let vendorOwnerBToken: string;
  let customerId: string;
  let customerToken: string;

  beforeEach(async () => {
    await setupTestDatabase();

    // 1. Super Admin
    const admin = await createAccount({
      phone: "+251911000000",
      name: "Global Admin",
      role: "super_admin",
    });
    adminId = admin.id;
    const adminSession = await createSession(adminId);
    adminToken = adminSession.sessionToken;

    // 2. Vendor Owner A
    const ownerA = await createAccount({
      phone: "+251911111001",
      name: "Vendor A Owner",
      role: "vendor",
    });
    vendorOwnerAId = ownerA.id;
    const ownerASession = await createSession(vendorOwnerAId);
    vendorOwnerAToken = ownerASession.sessionToken;

    // 3. Vendor Owner B
    const ownerB = await createAccount({
      phone: "+251911111002",
      name: "Vendor B Owner",
      role: "vendor",
    });
    vendorOwnerBId = ownerB.id;
    const ownerBSession = await createSession(vendorOwnerBId);
    vendorOwnerBToken = ownerBSession.sessionToken;

    // 4. Customer
    const customer = await createAccount({
      phone: "+251911111003",
      name: "Customer User",
      role: "user",
    });
    customerId = customer.id;
    const customerSession = await createSession(customerId);
    customerToken = customerSession.sessionToken;
  });

  it("POST /api/vendors allows vendor account to create profile and rejects customer", async () => {
    // 1. Customer attempt -> 403 Forbidden
    const custReq = createMockRequest("http://localhost:3000/api/vendors", "POST", customerToken, {
      name: "Unauthorized Vendor",
      category: "Catering",
    });
    const custRes = await createVendorRoute(custReq);
    expect(custRes.status).toBe(403);

    // 2. Vendor account attempt -> 201 Created
    const vendorReq = createMockRequest("http://localhost:3000/api/vendors", "POST", vendorOwnerAToken, {
      name: "Abyssinia Sound & Lights",
      category: "Sound & DJ",
      priceRange: "ETB 20,000 - 50,000",
      area: "Bole",
    });
    const vendorRes = await createVendorRoute(vendorReq);
    expect(vendorRes.status).toBe(201);
    const body = await vendorRes.json();
    expect(body.vendor).toBeDefined();
    expect(body.vendor.name).toBe("Abyssinia Sound & Lights");
    expect(body.vendor.boostStatus).toBe("standard");
    expect(body.vendor.verified).toBe(false);
  });

  it("GET /api/vendors returns deterministically ranked vendor directory publicly", async () => {
    // Standard Vendor
    const vStandard = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Standard Vendor",
      category: "Photography",
      area: "Bole",
    });

    // Boosted Vendor
    const vBoosted = await createVendor({
      ownerId: vendorOwnerBId,
      name: "Boosted Vendor",
      category: "Photography",
      area: "Bole",
    });
    await setVendorBoost({
      vendorId: vBoosted.id,
      callerId: vendorOwnerBId,
      boostStatus: "boosted",
      boostScore: 50,
    });

    // Public request without session
    const req = createMockRequest("http://localhost:3000/api/vendors?category=Photography", "GET");
    const res = await listVendorsRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.vendors).toBeInstanceOf(Array);
    expect(body.vendors.length).toBe(2);
    // Boosted vendor must appear before standard
    expect(body.vendors[0].id).toBe(vBoosted.id);
    expect(body.vendors[1].id).toBe(vStandard.id);
  });

  it("PATCH /api/vendors/[id] allows owner to edit profile and rejects foreign accounts", async () => {
    const vendor = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Old Brand",
      category: "Decor",
    });

    // Foreign vendor B tries to update vendor A -> 403
    const foreignReq = createMockRequest(
      `http://localhost:3000/api/vendors/${vendor.id}`,
      "PATCH",
      vendorOwnerBToken,
      { name: "Hijacked Brand" }
    );
    const foreignRes = await patchVendorRoute(foreignReq, {
      params: Promise.resolve({ id: vendor.id }),
    });
    expect(foreignRes.status).toBe(403);

    // Owner updates vendor -> 200
    const ownerReq = createMockRequest(
      `http://localhost:3000/api/vendors/${vendor.id}`,
      "PATCH",
      vendorOwnerAToken,
      { name: "New Brand Title", area: "Kazanchis" }
    );
    const ownerRes = await patchVendorRoute(ownerReq, {
      params: Promise.resolve({ id: vendor.id }),
    });
    expect(ownerRes.status).toBe(200);
    const body = await ownerRes.json();
    expect(body.vendor.name).toBe("New Brand Title");
    expect(body.vendor.area).toBe("Kazanchis");
  });

  it("POST /api/vendors/[id]/verify restricts verification strictly to super_admin", async () => {
    const vendor = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Trust Candidate",
      category: "Catering",
    });

    // Owner tries to verify themselves -> 403
    const ownerReq = createMockRequest(
      `http://localhost:3000/api/vendors/${vendor.id}/verify`,
      "POST",
      vendorOwnerAToken,
      { verified: true }
    );
    const ownerRes = await verifyVendorRoute(ownerReq, {
      params: Promise.resolve({ id: vendor.id }),
    });
    expect(ownerRes.status).toBe(403);

    // Super Admin verifies -> 200
    const adminReq = createMockRequest(
      `http://localhost:3000/api/vendors/${vendor.id}/verify`,
      "POST",
      adminToken,
      { verified: true }
    );
    const adminRes = await verifyVendorRoute(adminReq, {
      params: Promise.resolve({ id: vendor.id }),
    });
    expect(adminRes.status).toBe(200);
    const body = await adminRes.json();
    expect(body.vendor.verified).toBe(true);
  });
});
