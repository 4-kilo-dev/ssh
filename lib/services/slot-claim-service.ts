/**
 * Slot Claim Service — Phase 4
 *
 * Implements the core time-claim persistence layer backed by Postgres GIST exclusion:
 * - Creates atomic time claims on halls.
 * - Handles exclusion violations (code 23P01) with clean domain errors.
 * - Manages claim lifecycle (active -> released).
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  slotClaims,
  type SlotClaim,
  type SlotClaimType,
  type SlotClaimStatus,
} from "../db/schema";

export interface CreateSlotClaimInput {
  hallId: string;
  startTime: Date;
  endTime: Date;
  claimType: SlotClaimType;
  status?: SlotClaimStatus;
  reason?: string | null;
  createdById: string;
  referenceId?: string | null;
}

/**
 * Creates a time claim on a hall.
 * Protected by Postgres GIST exclusion constraint:
 * EXCLUDE USING gist (hall_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&) WHERE (status = 'active')
 *
 * If another active claim overlaps this time window on this hall, Postgres atomically rejects it.
 */
export async function createSlotClaim(input: CreateSlotClaimInput): Promise<SlotClaim> {
  if (input.startTime >= input.endTime) {
    throw new Error("Start time must be strictly before end time");
  }

  const db = getDb();

  try {
    const [created] = await db
      .insert(slotClaims)
      .values({
        hallId: input.hallId,
        startTime: input.startTime,
        endTime: input.endTime,
        claimType: input.claimType,
        status: input.status ?? "active",
        reason: input.reason?.trim() ?? null,
        createdById: input.createdById,
        referenceId: input.referenceId ?? null,
      })
      .returning();

    return created;
  } catch (err: any) {
    // Check for Postgres exclusion constraint violation (code 23P01)
    if (err.code === "23P01" || err.message?.includes("slot_claims_no_overlap")) {
      throw new Error(
        "Double-booking prevented by exclusion constraint: overlapping active claim exists for this hall"
      );
    }
    throw err;
  }
}

/**
 * Retrieves a claim by its ID.
 */
export async function getSlotClaimById(id: string): Promise<SlotClaim | null> {
  const db = getDb();
  const [claim] = await db.select().from(slotClaims).where(eq(slotClaims.id, id)).limit(1);
  return claim ?? null;
}

/**
 * Releases/cancels a claim, immediately freeing the slot under the partial exclusion constraint.
 */
export async function releaseSlotClaim(
  claimId: string,
  callerId: string
): Promise<SlotClaim> {
  const claim = await getSlotClaimById(claimId);
  if (!claim) {
    throw new Error("Claim not found");
  }

  const db = getDb();
  const [updated] = await db
    .update(slotClaims)
    .set({
      status: "released",
      updatedAt: new Date(),
    })
    .where(eq(slotClaims.id, claimId))
    .returning();

  return updated;
}

/**
 * Retrieves claims for a hall, optionally filtered by status (default: 'active').
 */
export async function getSlotClaimsByHall(
  hallId: string,
  status: SlotClaimStatus = "active"
): Promise<SlotClaim[]> {
  const db = getDb();
  return await db
    .select()
    .from(slotClaims)
    .where(and(eq(slotClaims.hallId, hallId), eq(slotClaims.status, status)))
    .orderBy(slotClaims.startTime);
}
