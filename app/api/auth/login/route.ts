import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/services/account-service";
import { createSession, serializeSessionCookie } from "@/lib/auth/session";

/**
 * POST /api/auth/login
 *
 * Authenticates with phone + password, creates an active session,
 * and sets an HTTP-only session cookie.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, password } = body;

    if (!phone || typeof phone !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { status: "error", error: "Phone and password are required" },
        { status: 400 }
      );
    }

    // 1. Verify credentials with timing-safe comparison
    const account = await verifyCredentials(phone, password);
    if (!account) {
      return NextResponse.json(
        { status: "error", error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    // 2. Create server-side session
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const session = await createSession(account.id, { userAgent });

    // 3. Serialize cookie
    const cookieHeader = serializeSessionCookie(session.sessionToken, session.expiresAt);

    return NextResponse.json(
      {
        status: "ok",
        account: {
          id: account.id,
          name: account.name,
          phone: account.phone,
          role: account.role,
          telegramId: account.telegramId,
        },
      },
      {
        status: 200,
        headers: { "Set-Cookie": cookieHeader },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication error";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
