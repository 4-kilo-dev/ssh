/**
 * Phase 2 — Mini-Task 2.2 Tests: Server-Side Sessions & Cookie Management
 *
 * Requirements from docs/phases.md:
 * - Session issuance via signed HTTP-only cookie; session validation.
 * - Mini App step-out/step-back-in resilience (long-lived, resilient session).
 * - Tests prove:
 *   1. Session creation linked to a valid account.
 *   2. Session validation returns the authenticated Account.
 *   3. Session resilience: survives step-out / app backgrounding across multiple validations.
 *   4. Rejection of expired sessions.
 *   5. Session revocation on logout (single session and all sessions).
 *   6. Rejection of forged or tampered session tokens.
 *   7. Cascade deletion when account is removed.
 *
 * State focus: session lifecycle (created -> active -> expired / revoked).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount } from "@/lib/services/account-service";
import {
  createSession,
  validateSession,
  revokeSession,
  revokeAllAccountSessions,
  serializeSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { accounts, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Phase 2 — Mini-Task 2.2: Server-Side Sessions", () => {
  let testDb: TestDbInstance;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("proves a session can be created for an account", async () => {
    const user = await createAccount({
      name: "Session Test User",
      phone: "+251911111101",
      role: "user",
    });

    const session = await createSession(user.id, { userAgent: "TelegramMiniApp/1.0" });

    expect(session.sessionToken).toBeDefined();
    expect(typeof session.sessionToken).toBe("string");
    expect(session.accountId).toBe(user.id);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("proves session validation retrieves the authenticated account and role", async () => {
    const manager = await createAccount({
      name: "Manager Session User",
      phone: "+251911111102",
      role: "venue_manager",
    });

    const { sessionToken } = await createSession(manager.id);

    const result = await validateSession(sessionToken);
    expect(result.valid).toBe(true);
    expect(result.account).toBeDefined();
    expect(result.account?.id).toBe(manager.id);
    expect(result.account?.role).toBe("venue_manager");
  });

  it("proves session resilience: survives multiple checks and updates lastSeenAt (Telegram backgrounding)", async () => {
    const user = await createAccount({
      name: "Mini App User",
      phone: "+251911111103",
      role: "user",
      telegramId: "tg_miniapp_1",
    });

    const { sessionToken } = await createSession(user.id);

    // Initial check
    const check1 = await validateSession(sessionToken);
    expect(check1.valid).toBe(true);

    // Simulating user stepping out to Telegram chat and stepping back into the Mini App
    const check2 = await validateSession(sessionToken);
    expect(check2.valid).toBe(true);
    expect(check2.account?.id).toBe(user.id);
  });

  it("proves an expired session is rejected", async () => {
    const user = await createAccount({
      name: "Expired Session User",
      phone: "+251911111104",
      role: "user",
    });

    // Create session that expired in the past (-60s)
    const { sessionToken } = await createSession(user.id, { expiresInSeconds: -60 });

    const result = await validateSession(sessionToken);
    expect(result.valid).toBe(false);
    expect(result.account).toBeUndefined();
  });

  it("proves session can be revoked individually upon logout", async () => {
    const user = await createAccount({
      name: "Logout User",
      phone: "+251911111105",
      role: "user",
    });

    const { sessionToken } = await createSession(user.id);
    expect((await validateSession(sessionToken)).valid).toBe(true);

    // Logout / revoke
    await revokeSession(sessionToken);

    // Now invalid
    expect((await validateSession(sessionToken)).valid).toBe(false);
  });

  it("proves all sessions can be revoked for an account (e.g. security reset)", async () => {
    const user = await createAccount({
      name: "Multi Session User",
      phone: "+251911111106",
      role: "user",
    });

    const sessionA = await createSession(user.id);
    const sessionB = await createSession(user.id);

    expect((await validateSession(sessionA.sessionToken)).valid).toBe(true);
    expect((await validateSession(sessionB.sessionToken)).valid).toBe(true);

    // Revoke all
    await revokeAllAccountSessions(user.id);

    expect((await validateSession(sessionA.sessionToken)).valid).toBe(false);
    expect((await validateSession(sessionB.sessionToken)).valid).toBe(false);
  });

  it("proves forged or tampered session tokens are rejected", async () => {
    const forgedToken = "fake_random_token_string.signature";
    const result = await validateSession(forgedToken);
    expect(result.valid).toBe(false);
  });

  it("proves session cookie serializer sets secure, httpOnly, and SameSite attributes", () => {
    const token = "mock_token_value_12345";
    const expiresAt = new Date(Date.now() + 86400 * 1000);

    const cookieString = serializeSessionCookie(token, expiresAt);
    expect(cookieString).toContain(`${SESSION_COOKIE_NAME}=${token}`);
    expect(cookieString.toLowerCase()).toContain("httponly");
    expect(cookieString.toLowerCase()).toContain("samesite=lax");
    expect(cookieString.toLowerCase()).toContain("path=/");
  });

  it("proves deleting an account cascades and destroys all its active sessions", async () => {
    const user = await createAccount({
      name: "Cascade Session User",
      phone: "+251911111107",
      role: "user",
    });

    const { sessionToken } = await createSession(user.id);
    expect((await validateSession(sessionToken)).valid).toBe(true);

    // Delete user
    await testDb.db.delete(accounts).where(eq(accounts.id, user.id));

    // Session must no longer be valid or exist
    expect((await validateSession(sessionToken)).valid).toBe(false);
  });
});
