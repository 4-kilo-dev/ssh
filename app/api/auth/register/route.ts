import { NextResponse } from "next/server";
import { createAccount, getAccountByPhone, setPassword } from "@/lib/services/account-service";
import { createSession, serializeSessionCookie, isMobileClient } from "@/lib/auth/session";
import { normalizeEthiopianPhone } from "@/lib/phone";

/**
 * POST /api/auth/register
 *
 * Self sign-up for customers (role "user") with name + phone + password.
 * Venue managers, vendors and admins are still created by staff.
 * Creates a session right away so the person is signed in after sign-up.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, phone, password } = body ?? {};

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName || trimmedName.length > 80) {
      return NextResponse.json(
        { status: "error", error: "Please enter your name (up to 80 characters)" },
        { status: 400 }
      );
    }

    const normalizedPhone = typeof phone === "string" ? normalizeEthiopianPhone(phone) : null;
    if (!normalizedPhone) {
      return NextResponse.json(
        { status: "error", error: "Please enter a valid Ethiopian mobile number, e.g. 0911 223344" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { status: "error", error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await getAccountByPhone(normalizedPhone);
    if (existing) {
      return NextResponse.json(
        { status: "error", error: "An account with this phone number already exists. Please sign in." },
        { status: 409 }
      );
    }

    let account;
    try {
      account = await createAccount({ name: trimmedName, phone: normalizedPhone, role: "user" });
    } catch (err: any) {
      // Unique violation if two sign-ups race for the same phone
      if (err?.code === "23505") {
        return NextResponse.json(
          { status: "error", error: "An account with this phone number already exists. Please sign in." },
          { status: 409 }
        );
      }
      throw err;
    }

    await setPassword(account.id, password);

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const session = await createSession(account.id, { userAgent });
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
        ...(isMobileClient(req)
          ? { sessionToken: session.sessionToken, expiresAt: session.expiresAt }
          : {}),
      },
      { status: 201, headers: { "Set-Cookie": cookieHeader } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-up failed";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
