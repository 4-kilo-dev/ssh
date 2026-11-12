import { NextResponse } from "next/server";
import { consumeOnboardingToken } from "@/lib/auth/tokens";
import { setPassword, getAccountById } from "@/lib/services/account-service";
import { createSession, serializeSessionCookie } from "@/lib/auth/session";

/**
 * POST /api/auth/onboard/set-password
 *
 * Consumes a one-time onboarding token, sets the account password,
 * creates an active session, and sets an HTTP-only session cookie.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ status: "error", error: "Token is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { status: "error", error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // 1. Atomically consume token (enforces single-use and expiration)
    const { accountId } = await consumeOnboardingToken(token);

    // 2. Set the password hash
    await setPassword(accountId, password);

    // 3. Resolve account details
    const account = await getAccountById(accountId);
    if (!account) {
      return NextResponse.json({ status: "error", error: "Account not found" }, { status: 404 });
    }

    // 4. Create resilient server session
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const session = await createSession(accountId, { userAgent });

    // 5. Serialize HTTP-only cookie
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
    const message = error instanceof Error ? error.message : "Failed to set password";
    return NextResponse.json({ status: "error", error: message }, { status: 400 });
  }
}
