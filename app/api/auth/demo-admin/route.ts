import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { createAccount, setPassword } from "@/lib/services/account-service";
import { createSession, serializeSessionCookie } from "@/lib/auth/session";
import { eq, or } from "drizzle-orm";

/**
 * POST /api/auth/demo-admin
 * Quick Super Admin login helper for manual visual verification in browser.
 */
export async function POST() {
  try {
    const telegramId = "tg_admin";
    const phone = "+251911000000";
    const name = "Addis Administrator";

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
        role: "super_admin",
        telegramId,
      });
      await setPassword(account.id, "password123");
    } else {
      if (account.role !== "super_admin") {
        await db
          .update(accounts)
          .set({ role: "super_admin" })
          .where(eq(accounts.id, account.id));
      }
      await setPassword(account.id, "password123").catch(() => {});
    }

    const session = await createSession(account.id, { userAgent: "BrowserDemoAdmin/1.0" });
    const cookie = serializeSessionCookie(session.sessionToken, session.expiresAt);

    const response = NextResponse.json({
      status: "ok",
      admin: {
        id: account.id,
        name: account.name,
        phone: account.phone,
        role: "super_admin",
      },
    });

    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
