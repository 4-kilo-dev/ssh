/**
 * Slot Block Service — Phase 4
 *
 * Implements manual off-platform blocks:
 * - Allows venue managers to block a hall for off-platform events or maintenance.
 * - Strictly enforces ownership: only the venue's owner can place or release blocks.
 * - Delegates time-claim creation and exclusion enforcement to slot-claim-service.
 */

import { getHallById } from "./hall-service";
import { getVenueById } from "./venue-service";
import {
  createSlotClaim,
  releaseSlotClaim,
  getSlotClaimById,
  getSlotClaimsByHall,
} from "./slot-claim-service";
import type { SlotClaim } from "../db/schema";

export interface CreateSlotBlockInput {
  managerId: string;
  hallId: string;
  startTime: Date;
  endTime: Date;
  reason?: string | null;
}

/**
 * Creates a manual SlotBlock on a hall.
 * Enforces ownership boundary: caller `managerId` must own the hall's venue.
 */
export async function createSlotBlock(input: CreateSlotBlockInput): Promise<SlotClaim> {
  const hall = await getHallById(input.hallId);
  if (!hall) {
    throw new Error("Hall not found");
  }

  const venue = await getVenueById(hall.venueId);
  if (!venue || venue.managerId !== input.managerId) {
    throw new Error("Unauthorized: caller is not the owner of this venue");
  }

  return await createSlotClaim({
    hallId: input.hallId,
    startTime: input.startTime,
    endTime: input.endTime,
    claimType: "block",
    reason: input.reason ?? "Manual off-platform block",
    createdById: input.managerId,
  });
}

/**
 * Releases a manual SlotBlock.
 * Enforces ownership boundary: caller `managerId` must own the hall's venue.
 */
export async function releaseSlotBlock(
  blockId: string,
  managerId: string
): Promise<SlotClaim> {
  const claim = await getSlotClaimById(blockId);
  if (!claim) {
    throw new Error("Slot block not found");
  }

  const hall = await getHallById(claim.hallId);
  if (!hall) {
    throw new Error("Hall not found");
  }

  const venue = await getVenueById(hall.venueId);
  if (!venue || venue.managerId !== managerId) {
    throw new Error("Unauthorized: caller is not the owner of this venue");
  }

  return await releaseSlotClaim(blockId, managerId);
}

/**
 * Retrieves active SlotBlocks for a hall.
 */
export async function getSlotBlocksByHall(hallId: string): Promise<SlotClaim[]> {
  const claims = await getSlotClaimsByHall(hallId, "active");
  return claims.filter((c) => c.claimType === "block");
}
