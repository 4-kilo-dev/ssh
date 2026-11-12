import { NextResponse } from "next/server";
import { authenticateManager } from "@/lib/auth/require-manager";
import { releaseSlotBlock } from "@/lib/services/slot-block-service";

type RouteParams = {
  params: Promise<{ id: string; hallId: string; blockId: string }>;
};

/**
 * DELETE /api/venues/[id]/halls/[hallId]/blocks/[blockId]
 * Releases a slot block, freeing the time window.
 * Requires authenticated owner manager.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { blockId } = await params;
    const auth = await authenticateManager(req);
    if (auth.status !== 200 || !auth.account) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const released = await releaseSlotBlock(blockId, auth.account.id);
    return NextResponse.json({ status: "ok", success: true, released }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to release slot block";
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
