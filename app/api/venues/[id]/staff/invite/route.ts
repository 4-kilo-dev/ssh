import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { issueStaffInviteToken } from "@/lib/services/venue-staff-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/venues/[id]/staff/invite
 * Generates or regenerates an onboarding password-setup link for an existing staff member.
 * Caller must be a venue owner or super_admin.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { staffAccountId } = body;

    if (!staffAccountId || typeof staffAccountId !== "string") {
      return NextResponse.json({ error: "staffAccountId is required" }, { status: 400 });
    }

    const result = await issueStaffInviteToken(id, staffAccountId, auth.account.id, auth.account.role);

    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate staff invite link";
    const status = message.includes("Unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
