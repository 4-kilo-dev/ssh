/**
 * Venue Staff & Team Management Service — Phase 3.5
 *
 * Solves manager turnover and enables multi-user venue management:
 * - Decouples venue operations from any single employee's phone number.
 * - Supports granular roles: 'owner', 'manager', 'receptionist'.
 * - Safely handles employee departure: deactivate or remove staff in 1 click without affecting the venue.
 * - Supports smooth ownership transfer to a successor manager.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  venues,
  venueMembers,
  accounts,
  type Venue,
  type VenueMember,
  type VenueMemberRole,
  type Account,
} from "@/lib/db/schema";
import { getAccountById, getAccountByPhone, createAccount } from "@/lib/services/account-service";
import { normalizeEthiopianPhone } from "@/lib/phone";

export interface VenueStaffMember {
  id: string;
  venueId: string;
  accountId: string;
  name: string;
  phone: string;
  role: VenueMemberRole;
  title: string | null;
  isActive: boolean;
  isPrimaryOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddStaffInput {
  venueId: string;
  phone: string;
  name: string;
  role?: VenueMemberRole;
  title?: string;
  callerId: string;
  callerRole?: string;
}

export interface UpdateStaffInput {
  venueId: string;
  staffAccountId: string;
  role?: VenueMemberRole;
  title?: string;
  isActive?: boolean;
  callerId: string;
  callerRole?: string;
}

export interface RemoveStaffInput {
  venueId: string;
  staffAccountId: string;
  callerId: string;
  callerRole?: string;
}

export interface TransferOwnershipInput {
  venueId: string;
  newOwnerPhoneOrId: string;
  callerId: string;
  callerRole?: string;
}

/**
 * Checks whether an account has access to a venue at the requested role tier:
 * - 'receptionist': can view schedules and reservations.
 * - 'manager': can manage halls, pricing, blocks, bookings, inquiries, and photos.
 * - 'owner': can manage team members, edit venue settings, or delete venue.
 */
export async function checkVenueAccess(
  venueId: string,
  accountId: string,
  requiredRole: VenueMemberRole = "manager",
  allowSuperAdmin: boolean = true
): Promise<{ authorized: boolean; member?: VenueMember; isPrimaryOwner: boolean; role?: VenueMemberRole }> {
  const db = getDb();

  // 1. Check if caller is super_admin (if allowed for this action)
  if (allowSuperAdmin) {
    const caller = await getAccountById(accountId);
    if (caller?.role === "super_admin") {
      return { authorized: true, isPrimaryOwner: true, role: "owner" };
    }
  }

  // 2. Fetch venue
  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    return { authorized: false, isPrimaryOwner: false };
  }

  const isPrimary = venue.managerId === accountId;

  // 3. Check venue_members table
  const [member] = await db
    .select()
    .from(venueMembers)
    .where(and(eq(venueMembers.venueId, venueId), eq(venueMembers.accountId, accountId)))
    .limit(1);

  if (member && member.isActive) {
    if (requiredRole === "receptionist") {
      return { authorized: true, member, isPrimaryOwner: isPrimary, role: member.role };
    }
    if (requiredRole === "manager") {
      const authorized = member.role === "owner" || member.role === "manager";
      return { authorized, member, isPrimaryOwner: isPrimary, role: member.role };
    }
    if (requiredRole === "owner") {
      const authorized = member.role === "owner" || isPrimary;
      return { authorized, member, isPrimaryOwner: isPrimary, role: member.role };
    }
  }

  // 4. Fallback: if caller is the primary venue.managerId, grant owner access
  if (isPrimary) {
    return { authorized: true, isPrimaryOwner: true, role: "owner" };
  }

  return { authorized: false, isPrimaryOwner: false };
}

/**
 * Lists all staff members associated with a venue.
 */
export async function listVenueStaff(venueId: string): Promise<VenueStaffMember[]> {
  const db = getDb();

  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    throw new Error("Venue not found");
  }

  const rows = await db
    .select({
      id: venueMembers.id,
      venueId: venueMembers.venueId,
      accountId: venueMembers.accountId,
      role: venueMembers.role,
      title: venueMembers.title,
      isActive: venueMembers.isActive,
      createdAt: venueMembers.createdAt,
      updatedAt: venueMembers.updatedAt,
      name: accounts.name,
      phone: accounts.phone,
    })
    .from(venueMembers)
    .innerJoin(accounts, eq(venueMembers.accountId, accounts.id))
    .where(eq(venueMembers.venueId, venueId))
    .orderBy(desc(venueMembers.createdAt));

  const result: VenueStaffMember[] = rows.map((r) => ({
    ...r,
    isPrimaryOwner: r.accountId === venue.managerId,
  }));

  // If primary manager account is not yet in venue_members (legacy row), inject them
  const hasPrimary = result.some((m) => m.accountId === venue.managerId);
  if (!hasPrimary) {
    const primaryAccount = await getAccountById(venue.managerId);
    if (primaryAccount) {
      result.unshift({
        id: "primary-" + venue.managerId,
        venueId: venue.id,
        accountId: primaryAccount.id,
        name: primaryAccount.name,
        phone: primaryAccount.phone,
        role: "owner",
        title: "Primary Owner",
        isActive: true,
        isPrimaryOwner: true,
        createdAt: venue.createdAt,
        updatedAt: venue.updatedAt,
      });
    }
  }

  return result;
}

/**
 * Adds or invites a new staff member to a venue.
 * If the phone number doesn't exist yet, provisions a new venue_manager account.
 */
export async function addStaffMember(input: AddStaffInput): Promise<VenueStaffMember> {
  const { venueId, phone, name, role = "manager", title, callerId, callerRole } = input;

  const access = await checkVenueAccess(venueId, callerId, "owner");
  if (!access.authorized && callerRole !== "super_admin") {
    throw new Error("Unauthorized: only venue owners or super_admin can add staff");
  }

  const normalizedPhone = normalizeEthiopianPhone(phone) || phone.trim();
  if (!normalizedPhone) {
    throw new Error("Valid phone number is required");
  }

  const db = getDb();

  // Find or create account
  let targetAccount = await getAccountByPhone(normalizedPhone);
  if (!targetAccount) {
    targetAccount = await createAccount({
      name: name.trim() || "Staff Member",
      phone: normalizedPhone,
      role: "venue_manager",
    });
  } else if (targetAccount.role === "user") {
    // Promote user to venue_manager so they can access manager tools
    const [promoted] = await db
      .update(accounts)
      .set({ role: "venue_manager", updatedAt: new Date() })
      .where(eq(accounts.id, targetAccount.id))
      .returning();
    targetAccount = promoted;
  }

  // Insert or reactivate in venue_members
  const [saved] = await db
    .insert(venueMembers)
    .values({
      venueId,
      accountId: targetAccount.id,
      role,
      title: title?.trim() || null,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [venueMembers.venueId, venueMembers.accountId],
      set: {
        role,
        title: title?.trim() || null,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);

  return {
    id: saved.id,
    venueId: saved.venueId,
    accountId: targetAccount.id,
    name: targetAccount.name,
    phone: targetAccount.phone,
    role: saved.role,
    title: saved.title,
    isActive: saved.isActive,
    isPrimaryOwner: venue ? venue.managerId === targetAccount.id : false,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  };
}

/**
 * Updates an existing staff member's role, title, or active status.
 */
export async function updateStaffMember(input: UpdateStaffInput): Promise<VenueMember> {
  const { venueId, staffAccountId, role, title, isActive, callerId, callerRole } = input;

  const access = await checkVenueAccess(venueId, callerId, "owner");
  if (!access.authorized && callerRole !== "super_admin") {
    throw new Error("Unauthorized: only venue owners or super_admin can update staff");
  }

  const db = getDb();
  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    throw new Error("Venue not found");
  }

  // Cannot deactivate the primary owner without transferring ownership first
  if (venue.managerId === staffAccountId && isActive === false) {
    throw new Error("Cannot deactivate the primary owner. Transfer venue ownership first.");
  }

  const updates: Partial<typeof venueMembers.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (role !== undefined) updates.role = role;
  if (title !== undefined) updates.title = title.trim();
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db
    .update(venueMembers)
    .set(updates)
    .where(and(eq(venueMembers.venueId, venueId), eq(venueMembers.accountId, staffAccountId)))
    .returning();

  if (!updated) {
    throw new Error("Staff member not found on this venue");
  }

  return updated;
}

/**
 * Removes a staff member from the venue.
 * Leaves the venue, its halls, bookings, and inquiries completely intact.
 */
export async function removeStaffMember(input: RemoveStaffInput): Promise<void> {
  const { venueId, staffAccountId, callerId, callerRole } = input;

  const access = await checkVenueAccess(venueId, callerId, "owner");
  if (!access.authorized && callerRole !== "super_admin") {
    throw new Error("Unauthorized: only venue owners or super_admin can remove staff");
  }

  const db = getDb();
  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    throw new Error("Venue not found");
  }

  if (venue.managerId === staffAccountId) {
    throw new Error("Cannot remove the primary owner. Transfer venue ownership first.");
  }

  await db
    .delete(venueMembers)
    .where(and(eq(venueMembers.venueId, venueId), eq(venueMembers.accountId, staffAccountId)));
}

/**
 * Transfers primary ownership of the venue to another account.
 * Updates venues.managerId and promotes the recipient to 'owner' in venue_members.
 */
export async function transferVenueOwnership(input: TransferOwnershipInput): Promise<Venue> {
  const { venueId, newOwnerPhoneOrId, callerId, callerRole } = input;

  const access = await checkVenueAccess(venueId, callerId, "owner");
  if (!access.authorized && callerRole !== "super_admin") {
    throw new Error("Unauthorized: only the current venue owner or super_admin can transfer ownership");
  }

  const db = getDb();
  const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue) {
    throw new Error("Venue not found");
  }

  // Find target account by ID (if UUID) or phone
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newOwnerPhoneOrId.trim());
  let targetAccount = isUuid ? await getAccountById(newOwnerPhoneOrId.trim()) : null;
  if (!targetAccount) {
    const normalizedPhone = normalizeEthiopianPhone(newOwnerPhoneOrId) || newOwnerPhoneOrId.trim();
    targetAccount = await getAccountByPhone(normalizedPhone);
  }

  if (!targetAccount) {
    throw new Error("New owner account not found. Please create or invite the account first.");
  }

  if (targetAccount.id === venue.managerId) {
    return venue; // Already the owner
  }

  // Ensure new owner has role venue_manager
  if (targetAccount.role === "user") {
    await db
      .update(accounts)
      .set({ role: "venue_manager", updatedAt: new Date() })
      .where(eq(accounts.id, targetAccount.id));
  }

  // Transactionally update venues.managerId and member roles
  const [updatedVenue] = await db
    .update(venues)
    .set({
      managerId: targetAccount.id,
      updatedAt: new Date(),
    })
    .where(eq(venues.id, venueId))
    .returning();

  // Ensure new owner is in venue_members as 'owner'
  await db
    .insert(venueMembers)
    .values({
      venueId,
      accountId: targetAccount.id,
      role: "owner",
      title: "Primary Owner",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [venueMembers.venueId, venueMembers.accountId],
      set: {
        role: "owner",
        isActive: true,
        updatedAt: new Date(),
      },
    });

  // Demote previous owner to 'manager' in venue_members so they retain staff access unless explicitly removed
  await db
    .insert(venueMembers)
    .values({
      venueId,
      accountId: venue.managerId,
      role: "manager",
      title: "Former Owner / Staff",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [venueMembers.venueId, venueMembers.accountId],
      set: {
        role: "manager",
        updatedAt: new Date(),
      },
    });

  return updatedVenue;
}

/**
 * Retrieves the venue associated with an account, either as the primary owner
 * (venues.managerId) or as an active team member (venue_members).
 */
export async function getVenueForAccount(accountId: string): Promise<Venue | null> {
  const db = getDb();

  // 1. Primary owner check
  const [primary] = await db.select().from(venues).where(eq(venues.managerId, accountId)).limit(1);
  if (primary) {
    return primary;
  }

  // 2. Active member check
  const [member] = await db
    .select({
      id: venues.id,
      managerId: venues.managerId,
      name: venues.name,
      area: venues.area,
      type: venues.type,
      description: venues.description,
      contactPhone: venues.contactPhone,
      contactEmail: venues.contactEmail,
      policies: venues.policies,
      amenities: venues.amenities,
      photos: venues.photos,
      createdAt: venues.createdAt,
      updatedAt: venues.updatedAt,
    })
    .from(venueMembers)
    .innerJoin(venues, eq(venueMembers.venueId, venues.id))
    .where(and(eq(venueMembers.accountId, accountId), eq(venueMembers.isActive, true)))
    .limit(1);

  return member ?? null;
}

