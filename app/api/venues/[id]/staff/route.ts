import { NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import {
  listVenueStaff,
  addStaffMember,
  updateStaffMember,
  removeStaffMember,
  checkVenueAccess,
} from "@/lib/services/venue-staff-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/venues/[id]/staff
 * Lists all staff members belonging to the venue.
 * Caller must be an authorized staff member (receptionist, manager, or owner) or super_admin.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const access = await checkVenueAccess(id, auth.account.id, "receptionist");
    if (!access.authorized && auth.account.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized: only venue staff can view team members" }, { status: 403 });
    }

    const staff = await listVenueStaff(id);
    return NextResponse.json({ status: "ok", staff });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list staff";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/venues/[id]/staff
 * Adds/invites a new staff member to the venue.
 * Caller must be an owner of the venue or super_admin.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { phone, name, role, title } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const member = await addStaffMember({
      venueId: id,
      phone,
      name: typeof name === "string" ? name : "Staff Member",
      role: role === "owner" || role === "receptionist" ? role : "manager",
      title: typeof title === "string" ? title : undefined,
      callerId: auth.account.id,
      callerRole: auth.account.role,
    });

    return NextResponse.json({ status: "ok", member }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add staff member";
    const status = message.includes("Unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PATCH /api/venues/[id]/staff
 * Updates a staff member's role, title, or active status.
 * Caller must be an owner of the venue or super_admin.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { staffAccountId, role, title, isActive } = body;

    if (!staffAccountId || typeof staffAccountId !== "string") {
      return NextResponse.json({ error: "staffAccountId is required" }, { status: 400 });
    }

    const updated = await updateStaffMember({
      venueId: id,
      staffAccountId,
      role,
      title,
      isActive,
      callerId: auth.account.id,
      callerRole: auth.account.role,
    });

    return NextResponse.json({ status: "ok", member: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update staff member";
    const status = message.includes("Unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/venues/[id]/staff
 * Removes a staff member from the venue.
 * Caller must be an owner of the venue or super_admin.
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authenticateSession(req);
    if (!auth.account) {
      return NextResponse.json({ error: auth.error || "Authentication required" }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const staffAccountId = searchParams.get("staffAccountId") || body.staffAccountId;

    if (!staffAccountId || typeof staffAccountId !== "string") {
      return NextResponse.json({ error: "staffAccountId is required" }, { status: 400 });
    }

    await removeStaffMember({
      venueId: id,
      staffAccountId,
      callerId: auth.account.id,
      callerRole: auth.account.role,
    });

    return NextResponse.json({ status: "ok", message: "Staff member removed successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove staff member";
    const status = message.includes("Unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
