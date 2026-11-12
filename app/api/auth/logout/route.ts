import { NextResponse } from "next/server";
import {
  getSessionTokenFromRequest,
  revokeSession,
  clearSessionCookie,
} from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 *
 * Revokes the server-side session and clears the session cookie.
 */
export async function POST(req: Request) {
  try {
    const sessionToken = getSessionTokenFromRequest(req);
    if (sessionToken) {
      await revokeSession(sessionToken);
    }

    const clearCookieHeader = clearSessionCookie();

    return NextResponse.json(
      { status: "ok" },
      {
        status: 200,
        headers: { "Set-Cookie": clearCookieHeader },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout error";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
