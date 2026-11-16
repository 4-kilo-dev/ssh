import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { createAccount } from "@/lib/services/account-service";
import { createSession, serializeSessionCookie } from "@/lib/auth/session";
import { verifyTelegramInitData } from "@/lib/auth/telegram";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = verifyTelegramInitData(typeof body?.initData === "string" ? body.initData : "");
    const telegramId = String(user.id);
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    const db = getDb();
    let [account] = await db.select().from(accounts).where(eq(accounts.telegramId, telegramId)).limit(1);
    if (!account) account = await createAccount({ name, phone: `telegram:${telegramId}`, role: "user", telegramId });
    const session = await createSession(account.id, { userAgent: req.headers.get("user-agent") ?? "Telegram Mini App" });
    const response = NextResponse.json({ status: "ok", account: { id: account.id, name: account.name, role: account.role, telegramId: account.telegramId } });
    response.headers.set("Set-Cookie", serializeSessionCookie(session.sessionToken, session.expiresAt));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram authentication failed";
    return NextResponse.json({ status: "error", error: message }, { status: message.includes("not configured") ? 503 : 401 });
  }
}
