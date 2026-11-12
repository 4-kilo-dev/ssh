import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { setVendorBoost } from "@/lib/services/vendor-service";
import type { VendorBoostStatus } from "@/lib/db/schema";

export async function POST(
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
    const { boostStatus, boostScore } = body;

    if (!boostStatus || (boostStatus !== "standard" && boostStatus !== "boosted")) {
      return NextResponse.json(
        { error: "Invalid boostStatus: must be 'standard' or 'boosted'" },
        { status: 400 }
      );
    }

    const updated = await setVendorBoost({
      vendorId: id,
      callerId: auth.account.id,
      boostStatus: boostStatus as VendorBoostStatus,
      boostScore: typeof boostScore === "number" ? boostScore : undefined,
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
