import { NextResponse } from "next/server";
import { getSessionTokenFromRequest, validateSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/auth/me
 *
 * Validates the session cookie and returns the authenticated account.
 * Supports Telegram Mini App backgrounding & resume verification.
 */
export async function GET(req: Request) {
  try {
    const sessionToken = getSessionTokenFromRequest(req);
    if (!sessionToken) {
      return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
    }

    const result = await validateSession(sessionToken);
    if (!result.valid || !result.account) {
      return NextResponse.json(
        { status: "unauthenticated", reason: result.reason },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: "authenticated",
      account: {
        id: result.account.id,
        name: result.account.name,
        phone: result.account.phone,
        role: result.account.role,
        telegramId: result.account.telegramId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session verification error";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const sessionToken = getSessionTokenFromRequest(req);
    if (!sessionToken) return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
    const result = await validateSession(sessionToken);
    if (!result.valid || !result.account) return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 120) return NextResponse.json({ status: "error", error: "Enter a valid name" }, { status: 400 });
    const db = getDb();
    const [account] = await db.update(accounts).set({ name, updatedAt: new Date() }).where(eq(accounts.id, result.account.id)).returning();
    return NextResponse.json({ status: "ok", account: { id: account.id, name: account.name, phone: account.phone, role: account.role, telegramId: account.telegramId } });
  } catch (error) {
    return NextResponse.json({ status: "error", error: error instanceof Error ? error.message : "Unable to update profile" }, { status: 500 });
  }
}
