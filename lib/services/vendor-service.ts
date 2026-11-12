/**
 * Vendor Service — Phase 8
 *
 * Implements the swappable vendor directory & deterministic ranking engine:
 * 1. Strict Isolation Invariant:
 *    - Vendor entities and operations NEVER reference or touch venues, halls, bookings, or slot claims.
 *    - The vendor module is completely decoupled and swappable.
 * 2. Deterministic Ranking:
 *    - Boosted vendors rank first (ordered by boostScore desc).
 *    - Within each boost tier, verified vendors rank ahead of unverified.
 *    - Standard vendors follow with verified ranking ahead of unverified.
 * 3. Scoped Permissions:
 *    - Vendor profiles can be managed by their owner or super_admin.
 *    - The 'verified' trust badge can ONLY be modified by super_admin.
 * 4. Audit Trail:
 *    - Every mutating action logs an immutable audit event.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  vendors,
  accounts,
  type Vendor,
  type VendorBoostStatus,
} from "../db/schema";
import { logAuditEvent } from "./audit-service";

export interface CreateVendorInput {
  ownerId: string;
  name: string;
  category: string;
  description?: string | null;
  priceRange?: string | null;
  phone?: string | null;
  email?: string | null;
  area?: string | null;
}

export interface ListVendorsOptions {
  category?: string;
  area?: string;
  verifiedOnly?: boolean;
  limit?: number;
}

export interface UpdateVendorInput {
  vendorId: string;
  callerId: string;
  name?: string;
  category?: string;
  description?: string | null;
  priceRange?: string | null;
  phone?: string | null;
  email?: string | null;
  area?: string | null;
}

export interface SetVendorBoostInput {
  vendorId: string;
  callerId: string;
  boostStatus: VendorBoostStatus;
  boostScore?: number;
}

export interface SetVendorVerifiedInput {
  vendorId: string;
  callerId: string;
  verified: boolean;
}

/**
 * Creates a new vendor profile.
 */
export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const db = getDb();

  // Validate owner account exists
  const [owner] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.ownerId))
    .limit(1);

  if (!owner) {
    throw new Error("Owner account not found");
  }

  const [vendor] = await db
    .insert(vendors)
    .values({
      ownerId: input.ownerId,
      name: input.name.trim(),
      category: input.category.trim(),
      description: input.description?.trim() ?? null,
      priceRange: input.priceRange?.trim() ?? null,
      phone: input.phone?.trim() ?? null,
      email: input.email?.trim() ?? null,
      area: input.area?.trim() ?? null,
      verified: false,
      boostStatus: "standard",
      boostScore: 0,
    })
    .returning();

  await logAuditEvent({
    actorId: input.ownerId,
    action: "vendor.created",
    targetType: "vendor",
    targetId: vendor.id,
    metadata: {
      name: vendor.name,
      category: vendor.category,
      area: vendor.area,
    },
  });

  return vendor;
}

/**
 * Retrieves a vendor by ID.
 */
export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  const db = getDb();
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  return vendor ?? null;
}

/**
 * Lists vendors with deterministic ranking:
 * 1. Boosted vendors rank first (by boostScore desc).
 * 2. Verified vendors rank ahead of unverified vendors.
 * 3. Latest created vendors follow.
 */
export async function listVendors(options?: ListVendorsOptions): Promise<Vendor[]> {
  const db = getDb();
  const conditions = [];

  if (options?.category) {
    conditions.push(eq(vendors.category, options.category));
  }
  if (options?.area) {
    conditions.push(eq(vendors.area, options.area));
  }
  if (options?.verifiedOnly) {
    conditions.push(eq(vendors.verified, true));
  }

  const query = db
    .select()
    .from(vendors)
    .orderBy(
      sql`CASE WHEN ${vendors.boostStatus} = 'boosted' THEN 1 ELSE 0 END DESC`,
      desc(vendors.boostScore),
      sql`CASE WHEN ${vendors.verified} = true THEN 1 ELSE 0 END DESC`,
      desc(vendors.createdAt)
    );

  if (conditions.length > 0) {
    return await query.where(and(...conditions)).limit(options?.limit ?? 100);
  }

  return await query.limit(options?.limit ?? 100);
}

/**
 * Updates vendor profile details.
 * Authorized callers: vendor owner or super_admin.
 */
export async function updateVendor(input: UpdateVendorInput): Promise<Vendor> {
  const db = getDb();

  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.callerId))
    .limit(1);

  if (!caller) {
    throw new Error("Caller account not found");
  }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, input.vendorId))
    .limit(1);

  if (!vendor) {
    throw new Error("Vendor not found");
  }

  const isOwner = vendor.ownerId === input.callerId;
  const isAdmin = caller.role === "super_admin";

  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized: caller is not the owner of this vendor profile");
  }

  const updateData: Partial<typeof vendors.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.category !== undefined) updateData.category = input.category.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() ?? null;
  if (input.priceRange !== undefined) updateData.priceRange = input.priceRange?.trim() ?? null;
  if (input.phone !== undefined) updateData.phone = input.phone?.trim() ?? null;
  if (input.email !== undefined) updateData.email = input.email?.trim() ?? null;
  if (input.area !== undefined) updateData.area = input.area?.trim() ?? null;

  const [updated] = await db
    .update(vendors)
    .set(updateData)
    .where(eq(vendors.id, input.vendorId))
    .returning();

  await logAuditEvent({
    actorId: input.callerId,
    action: "vendor.updated",
    targetType: "vendor",
    targetId: input.vendorId,
    metadata: updateData,
  });

  return updated;
}

/**
 * Updates vendor boost status and score.
 * Authorized callers: vendor owner or super_admin.
 */
export async function setVendorBoost(input: SetVendorBoostInput): Promise<Vendor> {
  const db = getDb();

  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.callerId))
    .limit(1);

  if (!caller) {
    throw new Error("Caller account not found");
  }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, input.vendorId))
    .limit(1);

  if (!vendor) {
    throw new Error("Vendor not found");
  }

  const isOwner = vendor.ownerId === input.callerId;
  const isAdmin = caller.role === "super_admin";

  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized: caller is not the owner of this vendor profile");
  }

  const newBoostScore =
    input.boostScore !== undefined
      ? input.boostScore
      : input.boostStatus === "boosted"
      ? 10
      : 0;

  const [updated] = await db
    .update(vendors)
    .set({
      boostStatus: input.boostStatus,
      boostScore: newBoostScore,
      updatedAt: new Date(),
    })
    .where(eq(vendors.id, input.vendorId))
    .returning();

  await logAuditEvent({
    actorId: input.callerId,
    action: "vendor.boost_updated",
    targetType: "vendor",
    targetId: input.vendorId,
    metadata: {
      boostStatus: input.boostStatus,
      boostScore: newBoostScore,
    },
  });

  return updated;
}

/**
 * Grants or revokes the verified trust badge.
 * Authorized callers: super_admin only.
 */
export async function setVendorVerified(input: SetVendorVerifiedInput): Promise<Vendor> {
  const db = getDb();

  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.callerId))
    .limit(1);

  if (!caller || caller.role !== "super_admin") {
    throw new Error("Not authorized: super_admin required to set verified badge");
  }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, input.vendorId))
    .limit(1);

  if (!vendor) {
    throw new Error("Vendor not found");
  }

  const [updated] = await db
    .update(vendors)
    .set({
      verified: input.verified,
      updatedAt: new Date(),
    })
    .where(eq(vendors.id, input.vendorId))
    .returning();

  await logAuditEvent({
    actorId: input.callerId,
    action: "vendor.verified_updated",
    targetType: "vendor",
    targetId: input.vendorId,
    metadata: {
      verified: input.verified,
    },
  });

  return updated;
}

/**
 * Deletes a vendor profile.
 * Authorized callers: vendor owner or super_admin.
 */
export async function deleteVendor(vendorId: string, callerId: string): Promise<boolean> {
  const db = getDb();

  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, callerId))
    .limit(1);

  if (!caller) {
    throw new Error("Caller account not found");
  }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);

  if (!vendor) {
    return false;
  }

  const isOwner = vendor.ownerId === callerId;
  const isAdmin = caller.role === "super_admin";

  if (!isOwner && !isAdmin) {
    throw new Error("Not authorized: caller is not the owner of this vendor profile");
  }

  await db.delete(vendors).where(eq(vendors.id, vendorId));

  await logAuditEvent({
    actorId: callerId,
    action: "vendor.deleted",
    targetType: "vendor",
    targetId: vendorId,
    metadata: {
      name: vendor.name,
    },
  });

  return true;
}
