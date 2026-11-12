import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { accounts, vendors } from "@/lib/db/schema";
import { createAccount, setPassword } from "@/lib/services/account-service";
import { createSession, serializeSessionCookie } from "@/lib/auth/session";
import { createVendor } from "@/lib/services/vendor-service";
import { eq, or } from "drizzle-orm";

/**
 * POST /api/auth/demo-vendor
 * 1-click test vendor authentication helper for visual verification in browser.
 */
export async function POST() {
  try {
    const telegramId = "tg_vendor_demo";
    const phone = "+251911440001";
    const name = "Selamawit Photography";

    const db = getDb();
    let [account] = await db
      .select()
      .from(accounts)
      .where(or(eq(accounts.telegramId, telegramId), eq(accounts.phone, phone)))
      .limit(1);

    if (!account) {
      account = await createAccount({
        phone,
        name,
        role: "vendor",
        telegramId,
      });
      await setPassword(account.id, "password123");
    } else {
      if (account.role !== "vendor" && account.role !== "super_admin") {
        await db.update(accounts).set({ role: "vendor" }).where(eq(accounts.id, account.id));
      }
      await setPassword(account.id, "password123").catch(() => {});
    }

    // Ensure vendor profile exists
    let [vendorProfile] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.ownerId, account.id))
      .limit(1);

    if (!vendorProfile) {
      vendorProfile = await createVendor({
        ownerId: account.id,
        name: "Selamawit Fine Art Photography",
        category: "Photography",
        description: "Capturing authentic Ethiopian wedding moments and timeless portraits across Addis Ababa.",
        priceRange: "ETB 35,000 - 90,000",
        phone: "+251911440001",
        email: "selamawit@addisvisuals.et",
        area: "Bole",
      });
    }

    const session = await createSession(account.id, { userAgent: "BrowserDemoVendor/1.0" });
    const cookie = serializeSessionCookie(session.sessionToken, session.expiresAt);

    const response = NextResponse.json({
      status: "ok",
      vendor: {
        id: account.id,
        name: account.name,
        phone: account.phone,
        role: account.role,
        profile: vendorProfile,
      },
    });

    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
