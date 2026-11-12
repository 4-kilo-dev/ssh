import { NextResponse } from "next/server";
import { getSessionTokenFromRequest, validateSession } from "@/lib/auth/session";

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
