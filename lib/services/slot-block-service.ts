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
import { logAuditEvent } from "./audit-service";
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

  const claim = await createSlotClaim({
    hallId: input.hallId,
    startTime: input.startTime,
    endTime: input.endTime,
    claimType: "block",
    reason: input.reason ?? "Manual off-platform block",
    createdById: input.managerId,
  });

  await logAuditEvent({
    actorId: input.managerId,
    action: "slot_block.created",
    targetType: "slot_block",
    targetId: claim.id,
    metadata: {
      hallId: input.hallId,
      reason: input.reason ?? "Manual off-platform block",
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
    },
  });

  return claim;
}

/**
 * Releases a manual SlotBlock.
 * Enforces ownership boundary: caller `managerId` must own the hall's venue.
 */
export async function releaseSlotBlock(
  blockIdOrInput: string | { blockId: string; managerId: string },
  managerIdArg?: string
): Promise<SlotClaim> {
  const blockId = typeof blockIdOrInput === "object" ? blockIdOrInput.blockId : blockIdOrInput;
  const managerId =
    typeof blockIdOrInput === "object" ? blockIdOrInput.managerId : (managerIdArg as string);

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

  const released = await releaseSlotClaim(blockId, managerId);

  await logAuditEvent({
    actorId: managerId,
    action: "slot_block.released",
    targetType: "slot_block",
    targetId: blockId,
    metadata: {
      hallId: claim.hallId,
    },
  });

  return released;
}

/**
 * Retrieves active SlotBlocks for a hall.
 */
export async function getSlotBlocksByHall(hallId: string): Promise<SlotClaim[]> {
  const claims = await getSlotClaimsByHall(hallId, "active");
  return claims.filter((c) => c.claimType === "block");
}
