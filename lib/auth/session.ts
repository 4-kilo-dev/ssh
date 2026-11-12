/**
 * Server-side session management.
 *
 * Implements database-backed sessions with cryptographic signing and cookie helpers.
 * Designed for resilience:
 * - 30-day default session TTL so users in Telegram Mini Apps don't get logged out
 *   when stepping out of the app and returning.
 * - Tracks `lastSeenAt` to monitor session activity.
 */
import { getDb } from "@/lib/db/client";
import { sessions, accounts, type Session, type Account } from "@/lib/db/schema";
import { randomBytes, createHmac } from "node:crypto";
import { eq } from "drizzle-orm";

const SECRET = process.env.AUTH_SECRET ?? "dev_secret_addisvenue_local_key_only";
export const SESSION_COOKIE_NAME = "addisvenue_session";
const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface CreateSessionOptions {
  expiresInSeconds?: number;
  userAgent?: string;
}

export interface ValidateSessionResult {
  valid: boolean;
  account?: Account;
  session?: Session;
  reason?: string;
}

/**
 * Creates a signed server-side session for an account.
 */
export async function createSession(
  accountId: string,
  options?: CreateSessionOptions
): Promise<Session> {
  const db = getDb();
  const ttl = options?.expiresInSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  // Generate 32 secure random bytes + HMAC signature
  const rawBytes = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", SECRET).update(rawBytes).digest("hex").slice(0, 16);
  const sessionToken = `${rawBytes}.${signature}`;

  const [session] = await db
    .insert(sessions)
    .values({
      accountId,
      sessionToken,
      expiresAt,
      userAgent: options?.userAgent ?? null,
    })
    .returning();

  return session;
}

/**
 * Validates a session token, returning the authenticated account if valid.
 * Updates `lastSeenAt` to record activity.
 */
export async function validateSession(sessionToken: string): Promise<ValidateSessionResult> {
  if (!sessionToken || typeof sessionToken !== "string" || !sessionToken.includes(".")) {
    return { valid: false, reason: "Malformed session token" };
  }

  const [rawBytes, signature] = sessionToken.split(".");
  const expectedSig = createHmac("sha256", SECRET).update(rawBytes).digest("hex").slice(0, 16);
  if (signature !== expectedSig) {
    return { valid: false, reason: "Invalid session signature" };
  }

  const db = getDb();

  // Query session joined with account
  const [row] = await db
    .select({
      session: sessions,
      account: accounts,
    })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);

  if (!row) {
    return { valid: false, reason: "Session not found" };
  }

  // Check expiration
  if (new Date() > row.session.expiresAt) {
    return { valid: false, reason: "Session expired" };
  }

  // Check account active state
  if (!row.account.isActive) {
    return { valid: false, reason: "Account inactive" };
  }

  // Update lastSeenAt asynchronously
  await db
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, row.session.id));

  return {
    valid: true,
    account: row.account,
    session: row.session,
  };
}

/**
 * Revokes a single session (standard logout).
 */
export async function revokeSession(sessionToken: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
}

/**
 * Revokes all active sessions for a given account (e.g. security credential reset).
 */
export async function revokeAllAccountSessions(accountId: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.accountId, accountId));
}

/**
 * Serializes a Set-Cookie header string for the session token.
 */
export function serializeSessionCookie(sessionToken: string, expiresAt: Date): string {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

/**
 * Serializes a Set-Cookie header string to clear/expire the session cookie.
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Extracts the session token from a standard Request Cookie header.
 */
export function getSessionTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!match) return null;
  return match.slice(SESSION_COOKIE_NAME.length + 1);
}
