import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { createAccount, setPassword } from "@/lib/services/account-service";
import { createSession, serializeSessionCookie } from "@/lib/auth/session";
import { eq, or } from "drizzle-orm";

/**
 * POST /api/auth/demo-user
 * Quick customer switcher helper for visual verification in browser.
 */
export async function POST(req: Request) {
  try {
    const { userPreset = "A" } = await req.json().catch(() => ({ userPreset: "A" }));

    const isB = userPreset === "B";
    const telegramId = isB ? "tg_user_sara" : "tg_user_dawit";
    const phone = isB ? "+251915999902" : "+251915112233";
    const name = isB ? "Sara Customer" : "Dawit Customer";

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
        role: "user",
        telegramId,
      });
      await setPassword(account.id, "password123");
    } else {
      await setPassword(account.id, "password123").catch(() => {});
    }

    const session = await createSession(account.id, { userAgent: "BrowserDemo/1.0" });
    const cookie = serializeSessionCookie(session.sessionToken, session.expiresAt);

    const response = NextResponse.json({
      status: "ok",
      user: {
        id: account.id,
        name: account.name,
        phone: account.phone,
        role: account.role,
      },
    });

    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to switch demo customer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
