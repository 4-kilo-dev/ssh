/**
 * Hall Service — Phase 3
 *
 * Implements Hall domain logic with strict ownership boundaries:
 * - A hall is the bookable unit and belongs to exactly one venue.
 * - Only the owning manager of the venue can create, update, or delete halls.
 * - Capacity must be positive (> 0).
 * - Hall names must be unique within a single venue.
 */

import { eq, and, ne } from "drizzle-orm";
import { getDb } from "../db/client";
import { halls, venues, type Hall, type HallSetting } from "../db/schema";
import { getVenueById } from "./venue-service";

export interface CreateHallInput {
  venueId: string;
  name: string;
  capacity: number;
  setting?: HallSetting;
  notes?: string;
}

export interface UpdateHallInput {
  name?: string;
  capacity?: number;
  setting?: HallSetting;
  notes?: string;
}

/**
 * Creates a new hall under a venue.
 * Enforces:
 * 1. Caller `managerId` must be the owner of the venue.
 * 2. Capacity must be > 0.
 * 3. Hall name must be unique within the venue.
 */
export async function createHall(
  managerId: string,
  input: CreateHallInput
): Promise<Hall> {
  if (input.capacity <= 0) {
    throw new Error("Capacity must be greater than zero");
  }

  const venue = await getVenueById(input.venueId);
  if (!venue) {
    throw new Error("Venue not found");
  }

  if (venue.managerId !== managerId) {
    throw new Error("Unauthorized: caller is not the owner of this venue");
  }

  const db = getDb();

  // Check unique hall name within venue
  const trimmedName = input.name.trim();
  const [existing] = await db
    .select()
    .from(halls)
    .where(and(eq(halls.venueId, input.venueId), eq(halls.name, trimmedName)))
    .limit(1);

  if (existing) {
    throw new Error(`Hall with name '${trimmedName}' already exists in this venue`);
  }

  const [created] = await db
    .insert(halls)
    .values({
      venueId: input.venueId,
      name: trimmedName,
      capacity: input.capacity,
      setting: input.setting ?? "indoor",
      notes: input.notes?.trim() ?? null,
    })
    .returning();

  return created;
}

/**
 * Retrieves a single hall by its ID.
 */
export async function getHallById(id: string): Promise<Hall | null> {
  const db = getDb();
  const [hall] = await db.select().from(halls).where(eq(halls.id, id)).limit(1);
  return hall ?? null;
}

/**
 * Retrieves all halls belonging to a specific venue.
 */
export async function getHallsByVenueId(venueId: string): Promise<Hall[]> {
  const db = getDb();
  return await db
    .select()
    .from(halls)
    .where(eq(halls.venueId, venueId))
    .orderBy(halls.name);
}

/**
 * Updates a hall's attributes.
 * Enforces ownership boundary: caller `managerId` must own the hall's venue.
 */
export async function updateHall(
  hallId: string,
  managerId: string,
  updates: UpdateHallInput
): Promise<Hall> {
  if (updates.capacity !== undefined && updates.capacity <= 0) {
    throw new Error("Capacity must be greater than zero");
  }

  const hall = await getHallById(hallId);
  if (!hall) {
    throw new Error("Hall not found");
  }

  const venue = await getVenueById(hall.venueId);
  if (!venue || venue.managerId !== managerId) {
    throw new Error("Unauthorized: caller is not the owner of this venue");
  }

  const db = getDb();

  if (updates.name) {
    const trimmedName = updates.name.trim();
    const [existing] = await db
      .select()
      .from(halls)
      .where(
        and(
          eq(halls.venueId, hall.venueId),
          eq(halls.name, trimmedName),
          ne(halls.id, hall.id)
        )
      )
      .limit(1);

    if (existing) {
      throw new Error(`Hall with name '${trimmedName}' already exists in this venue`);
    }
  }

  const [updated] = await db
    .update(halls)
    .set({
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.capacity !== undefined ? { capacity: updates.capacity } : {}),
      ...(updates.setting ? { setting: updates.setting } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes.trim() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(halls.id, hallId))
    .returning();

  return updated;
}

/**
 * Deletes a hall.
 * Enforces ownership boundary: caller `managerId` must own the hall's venue.
 */
export async function deleteHall(hallId: string, managerId: string): Promise<void> {
  const hall = await getHallById(hallId);
  if (!hall) {
    throw new Error("Hall not found");
  }

  const venue = await getVenueById(hall.venueId);
  if (!venue || venue.managerId !== managerId) {
    throw new Error("Unauthorized: caller is not the owner of this venue");
  }

  const db = getDb();
  await db.delete(halls).where(eq(halls.id, hallId));
}
