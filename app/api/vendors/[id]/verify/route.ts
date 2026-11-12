import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { setVendorVerified } from "@/lib/services/vendor-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.account.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: super_admin required to set verified badge" },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const { verified } = body;

    if (typeof verified !== "boolean") {
      return NextResponse.json(
        { error: "Invalid verified value: must be boolean" },
        { status: 400 }
      );
    }

    const updated = await setVendorVerified({
      vendorId: id,
      callerId: auth.account.id,
      verified,
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
