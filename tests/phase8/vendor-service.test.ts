/**
 * Phase 8 — Mini-Task 8.1: Vendor Service & Ranking Engine Tests
 *
 * Requirements from docs/phases.md:
 * 1. Vendor Directory & Profiles:
 *    - Vendors have name, category, description, priceRange, contact info, area.
 *    - Verified badge (boolean) indicates platform inspection/trust.
 *    - Boost status ('standard' vs 'boosted') with numeric boostScore for ranking.
 * 2. Deterministic Ranking Algorithm:
 *    - Boosted vendors rank first (ordered by boostScore desc).
 *    - Verified vendors rank before unverified vendors of equal boost tier.
 *    - Standard vendors follow chronologically or by ID.
 * 3. Scoped Updates:
 *    - Only the vendor owner (or super_admin) can update vendor profile details.
 *    - Only super_admin can grant or revoke the verified badge.
 *    - Vendor owner or super_admin can toggle boost status.
 * 4. Audit Trail:
 *    - Vendor creation, verification change, and boost transitions write immutable audit logs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import {
  createVendor,
  getVendorById,
  listVendors,
  updateVendor,
  setVendorBoost,
  setVendorVerified,
} from "../../lib/services/vendor-service";
import { listAuditLogs } from "../../lib/services/audit-service";

describe("Phase 8 — Mini-Task 8.1: Vendor Service & Ranking Engine", () => {
  let adminId: string;
  let vendorOwnerAId: string;
  let vendorOwnerBId: string;
  let customerId: string;

  beforeEach(async () => {
    await setupTestDatabase();

    // 1. Super Admin
    const admin = await createAccount({
      phone: "+251911000000",
      name: "Global Admin",
      role: "super_admin",
    });
    adminId = admin.id;

    // 2. Vendor Owner A
    const ownerA = await createAccount({
      phone: "+251911111001",
      name: "Solomon Decor",
      role: "vendor",
    });
    vendorOwnerAId = ownerA.id;

    // 3. Vendor Owner B
    const ownerB = await createAccount({
      phone: "+251911111002",
      name: "Bethlehem Photography",
      role: "vendor",
    });
    vendorOwnerBId = ownerB.id;

    // 4. Customer
    const customer = await createAccount({
      phone: "+251911111003",
      name: "Almaz Kebede",
      role: "user",
    });
    customerId = customer.id;
  });

  it("proves creating and retrieving a vendor profile with audit logging", async () => {
    const vendor = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Enat Wedding Decor & Stage Design",
      category: "Decor & Lighting",
      description: "Premier Ethiopian traditional and modern wedding stages.",
      priceRange: "ETB 45,000 - 150,000",
      phone: "+251911111001",
      email: "contact@enatdecor.et",
      area: "Bole",
    });

    expect(vendor.id).toBeDefined();
    expect(vendor.ownerId).toBe(vendorOwnerAId);
    expect(vendor.name).toBe("Enat Wedding Decor & Stage Design");
    expect(vendor.category).toBe("Decor & Lighting");
    expect(vendor.verified).toBe(false);
    expect(vendor.boostStatus).toBe("standard");
    expect(vendor.boostScore).toBe(0);

    // Retrieve by ID
    const fetched = await getVendorById(vendor.id);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe("Enat Wedding Decor & Stage Design");

    // Verify audit log entry
    const logs = await listAuditLogs({
      callerId: adminId,
      targetType: "vendor",
      action: "vendor.created",
    });
    const log = logs.find((l) => l.targetId === vendor.id);
    expect(log).toBeDefined();
    expect(log?.actorId).toBe(vendorOwnerAId);
  });

  it("proves deterministic ranking: boosted vendors rank first, then verified, then standard", async () => {
    // 1. Standard Unverified Vendor
    const v1 = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Vendor 1 - Standard Unverified",
      category: "Photography",
      area: "Bole",
    });

    // 2. Standard Verified Vendor
    const v2 = await createVendor({
      ownerId: vendorOwnerBId,
      name: "Vendor 2 - Standard Verified",
      category: "Photography",
      area: "Bole",
    });
    await setVendorVerified({
      vendorId: v2.id,
      callerId: adminId,
      verified: true,
    });

    // 3. Boosted Unverified Vendor (Score: 50)
    const ownerC = await createAccount({
      phone: "+251911111004",
      name: "Vendor C Owner",
      role: "vendor",
    });
    const v3 = await createVendor({
      ownerId: ownerC.id,
      name: "Vendor 3 - Boosted 50 Unverified",
      category: "Photography",
      area: "Bole",
    });
    await setVendorBoost({
      vendorId: v3.id,
      callerId: ownerC.id,
      boostStatus: "boosted",
      boostScore: 50,
    });

    // 4. Boosted High Score Vendor (Score: 100)
    const ownerD = await createAccount({
      phone: "+251911111005",
      name: "Vendor D Owner",
      role: "vendor",
    });
    const v4 = await createVendor({
      ownerId: ownerD.id,
      name: "Vendor 4 - Boosted 100 Unverified",
      category: "Photography",
      area: "Bole",
    });
    await setVendorBoost({
      vendorId: v4.id,
      callerId: ownerD.id,
      boostStatus: "boosted",
      boostScore: 100,
    });

    // 5. Boosted Verified Vendor (Score: 50)
    const ownerE = await createAccount({
      phone: "+251911111006",
      name: "Vendor E Owner",
      role: "vendor",
    });
    const v5 = await createVendor({
      ownerId: ownerE.id,
      name: "Vendor 5 - Boosted 50 Verified",
      category: "Photography",
      area: "Bole",
    });
    await setVendorBoost({
      vendorId: v5.id,
      callerId: ownerE.id,
      boostStatus: "boosted",
      boostScore: 50,
    });
    await setVendorVerified({
      vendorId: v5.id,
      callerId: adminId,
      verified: true,
    });

    // Fetch ranked listing
    const ranked = await listVendors();
    const rankedIds = ranked.map((v) => v.id);

    // Expected order:
    // 1st: v4 (Boosted score 100)
    // 2nd: v5 (Boosted score 50 + Verified)
    // 3rd: v3 (Boosted score 50 + Unverified)
    // 4th: v2 (Standard + Verified)
    // 5th: v1 (Standard + Unverified)
    expect(rankedIds.indexOf(v4.id)).toBeLessThan(rankedIds.indexOf(v5.id));
    expect(rankedIds.indexOf(v5.id)).toBeLessThan(rankedIds.indexOf(v3.id));
    expect(rankedIds.indexOf(v3.id)).toBeLessThan(rankedIds.indexOf(v2.id));
    expect(rankedIds.indexOf(v2.id)).toBeLessThan(rankedIds.indexOf(v1.id));
  });

  it("proves category, area, and verified filtering", async () => {
    const vPhotoBole = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Bole Snaps",
      category: "Photography",
      area: "Bole",
    });

    const vCateringBole = await createVendor({
      ownerId: vendorOwnerBId,
      name: "Bole Feast",
      category: "Catering",
      area: "Bole",
    });

    const vPhotoKazanchis = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Kazanchis Studio",
      category: "Photography",
      area: "Kazanchis",
    });
    await setVendorVerified({
      vendorId: vPhotoKazanchis.id,
      callerId: adminId,
      verified: true,
    });

    // Filter by Category
    const photos = await listVendors({ category: "Photography" });
    expect(photos.some((v) => v.id === vPhotoBole.id)).toBe(true);
    expect(photos.some((v) => v.id === vPhotoKazanchis.id)).toBe(true);
    expect(photos.some((v) => v.id === vCateringBole.id)).toBe(false);

    // Filter by Area
    const boleVendors = await listVendors({ area: "Bole" });
    expect(boleVendors.some((v) => v.id === vPhotoBole.id)).toBe(true);
    expect(boleVendors.some((v) => v.id === vCateringBole.id)).toBe(true);
    expect(boleVendors.some((v) => v.id === vPhotoKazanchis.id)).toBe(false);

    // Filter by Verified Only
    const verifiedOnly = await listVendors({ verifiedOnly: true });
    expect(verifiedOnly.some((v) => v.id === vPhotoKazanchis.id)).toBe(true);
    expect(verifiedOnly.some((v) => v.id === vPhotoBole.id)).toBe(false);
  });

  it("proves updateVendor enforces ownership boundaries", async () => {
    const vendor = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Original Name",
      category: "Decor",
    });

    // Foreign user attempt -> throws 403 / unauthorized
    await expect(
      updateVendor({
        vendorId: vendor.id,
        callerId: customerId,
        name: "Hacked Name",
      })
    ).rejects.toThrow(/not authorized|forbidden|owner/i);

    // Owner update -> succeeds
    const updated = await updateVendor({
      vendorId: vendor.id,
      callerId: vendorOwnerAId,
      name: "Updated Decor Name",
      priceRange: "ETB 30,000",
    });

    expect(updated.name).toBe("Updated Decor Name");
    expect(updated.priceRange).toBe("ETB 30,000");
  });

  it("proves setVendorVerified is restricted strictly to super_admin", async () => {
    const vendor = await createVendor({
      ownerId: vendorOwnerAId,
      name: "Unverified Vendor",
      category: "Music",
    });

    // Vendor owner attempts to verify themselves -> rejected
    await expect(
      setVendorVerified({
        vendorId: vendor.id,
        callerId: vendorOwnerAId,
        verified: true,
      })
    ).rejects.toThrow(/not authorized|super_admin required/i);

    // Customer attempts to verify vendor -> rejected
    await expect(
      setVendorVerified({
        vendorId: vendor.id,
        callerId: customerId,
        verified: true,
      })
    ).rejects.toThrow(/not authorized|super_admin required/i);

    // Super Admin verifies vendor -> succeeds
    const verified = await setVendorVerified({
      vendorId: vendor.id,
      callerId: adminId,
      verified: true,
    });
    expect(verified.verified).toBe(true);
  });
});
