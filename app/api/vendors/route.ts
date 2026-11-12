import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { createVendor, listVendors } from "@/lib/services/vendor-service";

export async function POST(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Only vendor or super_admin roles can register a vendor profile
  if (auth.account.role !== "vendor" && auth.account.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: vendor or super_admin account required" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, category, description, priceRange, phone, email, area } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
    }
    if (!category || typeof category !== "string" || !category.trim()) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const vendor = await createVendor({
      ownerId: auth.account.id,
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() ?? null,
      priceRange: priceRange?.trim() ?? null,
      phone: phone?.trim() ?? null,
      email: email?.trim() ?? null,
      area: area?.trim() ?? null,
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const area = searchParams.get("area") || undefined;
  const verified = searchParams.get("verified");
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

  try {
    const vendors = await listVendors({
      category,
      area,
      verifiedOnly: verified === "true",
      limit,
    });

    return NextResponse.json({ vendors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
