import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { getVendorById, updateVendor } from "@/lib/services/vendor-service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const vendor = await getVendorById(id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const updated = await updateVendor({
      vendorId: id,
      callerId: auth.account.id,
      ...body,
    });

    return NextResponse.json({ vendor: updated });
  } catch (err: any) {
    if (err.message?.includes("Not authorized")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err.message?.includes("Vendor not found")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
