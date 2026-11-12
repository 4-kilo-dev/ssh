import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { createAccount, setPassword } from "@/lib/services/account-service";
import { createSession, serializeSessionCookie } from "@/lib/auth/session";
import { eq, or } from "drizzle-orm";

/**
 * POST /api/auth/demo-manager
 * Quick manager switcher helper for visual verification in browser.
 */
export async function POST(req: Request) {
  try {
    const { managerId: preset } = await req.json().catch(() => ({ managerId: "A" }));

    const isB = preset === "B";
    const telegramId = isB ? "tg_mgr_b" : "tg_mgr_a";
    const phone = isB ? "+251911999902" : "+251911223344";
    const name = isB ? "Kebede Manager B" : "Abebe Manager A";

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
        role: "venue_manager",
        telegramId,
      });
      await setPassword(account.id, "password123");
    } else {
      // Ensure password exists
      await setPassword(account.id, "password123").catch(() => {});
    }

    const session = await createSession(account.id, { userAgent: "BrowserDemo/1.0" });
    const cookie = serializeSessionCookie(session.sessionToken, session.expiresAt);

    const response = NextResponse.json({
      status: "ok",
      manager: {
        id: account.id,
        name: account.name,
        phone: account.phone,
        role: account.role,
      },
    });

    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to switch demo manager";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
