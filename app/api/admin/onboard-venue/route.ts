import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { onboardPartnerVenue } from "@/lib/services/venue-staff-service";

/**
 * POST /api/admin/onboard-venue
 * Workflow A: Super Admin onboards a new partner venue (e.g. Capital Hotel & Spa).
 * Creates venue, manager account, registers in venue_members, and generates an onboarding link.
 * Caller must be super_admin.
 */
export async function POST(req: Request) {
  try {
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    if (auth.account.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      venueName,
      area,
      type,
      description,
      contactPhone,
      contactEmail,
      policies,
      managerName,
      managerPhone,
      managerTitle,
    } = body;

    if (!venueName || !area || !type) {
      return NextResponse.json(
        { error: "venueName, area, and type are required" },
        { status: 400 }
      );
    }

    if (!managerPhone || typeof managerPhone !== "string") {
      return NextResponse.json(
        { error: "Manager mobile phone number is required" },
        { status: 400 }
      );
    }

    const result = await onboardPartnerVenue({
      venueName,
      area,
      type,
      description,
      contactPhone,
      contactEmail,
      policies,
      managerName: managerName || "Lead Venue Manager",
      managerPhone,
      managerTitle,
      callerId: auth.account.id,
      callerRole: auth.account.role,
    });

    return NextResponse.json({ status: "ok", ...result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to onboard partner venue";
    const status = message.includes("Unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
