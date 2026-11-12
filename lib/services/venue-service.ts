/**
 * Venue Service — Phase 3
 *
 * Implements Venue domain logic with strict ownership boundaries:
 * - Only accounts with role 'venue_manager' may own a venue.
 * - 1:1 Manager-to-Venue constraint (one manager owns one entire venue).
 * - Only the owning manager can update or delete their venue.
 * - Public queries for listings and detail.
 */

import { eq, and, or, ilike } from "drizzle-orm";
import { getDb } from "../db/client";
import { venues, accounts, type Venue, type NewVenue } from "../db/schema";
import { getAccountById } from "./account-service";

export interface CreateVenueInput {
  managerId: string;
  name: string;
  area: string;
  type: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  policies?: string;
  amenities?: string[];
  photos?: string[];
}

export interface UpdateVenueInput {
  name?: string;
  area?: string;
  type?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  policies?: string;
  amenities?: string[];
  photos?: string[];
}

export interface ListVenuesFilters {
  area?: string;
  type?: string;
  query?: string;
}

/**
 * Creates a new venue.
 * Enforces:
 * 1. Owning account must exist and have the 'venue_manager' role.
 * 2. An account cannot own more than one venue (1:1 constraint).
 */
export async function createVenue(input: CreateVenueInput): Promise<Venue> {
  const manager = await getAccountById(input.managerId);
  if (!manager) {
    throw new Error("Account not found");
  }

  if (manager.role !== "venue_manager") {
    throw new Error("Only venue_manager accounts can own a venue");
  }

  // Check if this manager already owns a venue
  const existing = await getVenueByManagerId(input.managerId);
  if (existing) {
    throw new Error("Manager already owns a venue");
  }

  const db = getDb();
  const [created] = await db
    .insert(venues)
    .values({
      managerId: input.managerId,
      name: input.name,
      area: input.area,
      type: input.type,
      description: input.description ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail ?? null,
      policies: input.policies ?? null,
      amenities: input.amenities ?? [],
      photos: input.photos ?? [],
    })
    .returning();

  return created;
}

/**
 * Retrieves a venue by its primary ID.
 */
export async function getVenueById(id: string): Promise<Venue | null> {
  const db = getDb();
  const [venue] = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
  return venue ?? null;
}

/**
 * Retrieves a venue by its owning manager's account ID.
 */
export async function getVenueByManagerId(managerId: string): Promise<Venue | null> {
  const db = getDb();
  const [venue] = await db.select().from(venues).where(eq(venues.managerId, managerId)).limit(1);
  return venue ?? null;
}

/**
 * Updates a venue.
 * Enforces ownership boundary: caller `managerId` must match the venue's `managerId`.
 */
export async function updateVenue(
  venueId: string,
  managerId: string,
  updates: UpdateVenueInput
): Promise<Venue> {
  const venue = await getVenueById(venueId);
  if (!venue) {
    throw new Error("Venue not found");
  }

  if (venue.managerId !== managerId) {
    throw new Error("Unauthorized: caller is not the owner of this venue");
  }

  const db = getDb();
  const [updated] = await db
    .update(venues)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(venues.id, venueId))
    .returning();

  return updated;
}

/**
 * Deletes a venue.
 * Enforces ownership boundary: caller `managerId` must match the venue's `managerId`.
 * Database cascade will delete associated halls automatically.
 */
export async function deleteVenue(venueId: string, managerId: string): Promise<void> {
  const venue = await getVenueById(venueId);
  if (!venue) {
    throw new Error("Venue not found");
  }

  if (venue.managerId !== managerId) {
    throw new Error("Unauthorized: caller is not the owner of this venue");
  }

  const db = getDb();
  await db.delete(venues).where(eq(venues.id, venueId));
}

/**
 * Lists venues with optional filters for directory / search browsing.
 */
export async function listVenues(filters: ListVenuesFilters = {}): Promise<Venue[]> {
  const db = getDb();
  const conditions = [];

  if (filters.area) {
    conditions.push(ilike(venues.area, filters.area));
  }

  if (filters.type) {
    conditions.push(eq(venues.type, filters.type));
  }

  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(venues.name, pattern),
        ilike(venues.description, pattern),
        ilike(venues.area, pattern),
        ilike(venues.type, pattern)
      )
    );
  }

  const query = conditions.length > 0
    ? db.select().from(venues).where(and(...conditions))
    : db.select().from(venues);

  return await query;
}
