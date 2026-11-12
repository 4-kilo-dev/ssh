/**
 * Phase 2 — Mini-Task 2.1 Tests: Onboarding Deep-Link Tokens
 *
 * Requirements from docs/phases.md:
 * - Telegram-signed onboarding deep-link token (issue / expire / single-use).
 * - Tests prove:
 *   1. Token issuance linked to an account in 'account-exists' state.
 *   2. Successful validation and consumption of a fresh token.
 *   3. Rejection of already-used tokens (single-use guarantee).
 *   4. Rejection of expired tokens (time-to-live enforcement).
 *   5. Rejection of tampered / forged tokens.
 *   6. Cascade deletion when the underlying account is removed.
 *
 * State focus: token lifecycle (issued -> valid -> consumed / expired).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount } from "@/lib/services/account-service";
import {
  issueOnboardingToken,
  consumeOnboardingToken,
  validateOnboardingToken,
} from "@/lib/auth/tokens";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Phase 2 — Mini-Task 2.1: Onboarding Deep-Link Tokens", () => {
  let testDb: TestDbInstance;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("proves an onboarding token can be issued for an account", async () => {
    const user = await createAccount({
      name: "Token Test User",
      phone: "+251911000001",
      role: "user",
      telegramId: "tg_token_1",
    });

    const tokenRecord = await issueOnboardingToken(user.id);

    expect(tokenRecord.token).toBeDefined();
    expect(typeof tokenRecord.token).toBe("string");
    expect(tokenRecord.token.length).toBeGreaterThan(20);
    expect(tokenRecord.accountId).toBe(user.id);
    expect(tokenRecord.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("proves a valid token can be inspected/validated without consuming it", async () => {
    const user = await createAccount({
      name: "Inspect Token User",
      phone: "+251911000002",
      role: "user",
      telegramId: "tg_token_2",
    });

    const { token } = await issueOnboardingToken(user.id);

    const validation = await validateOnboardingToken(token);
    expect(validation.valid).toBe(true);
    expect(validation.accountId).toBe(user.id);
  });

  it("proves a token can be consumed once and returns the associated account", async () => {
    const user = await createAccount({
      name: "Consume Once User",
      phone: "+251911000003",
      role: "user",
      telegramId: "tg_token_3",
    });

    const { token } = await issueOnboardingToken(user.id);

    // First consumption succeeds
    const consumed = await consumeOnboardingToken(token);
    expect(consumed.accountId).toBe(user.id);
  });

  it("proves an onboarding token is strictly single-use (cannot be consumed twice)", async () => {
    const user = await createAccount({
      name: "Single Use User",
      phone: "+251911000004",
      role: "user",
      telegramId: "tg_token_4",
    });

    const { token } = await issueOnboardingToken(user.id);

    // Consume first time
    await consumeOnboardingToken(token);

    // Attempting to consume the same token a second time must throw
    await expect(consumeOnboardingToken(token)).rejects.toThrow(/already used|invalid/i);

    // Validating it should report invalid / used
    const validation = await validateOnboardingToken(token);
    expect(validation.valid).toBe(false);
  });

  it("proves an expired onboarding token is rejected", async () => {
    const user = await createAccount({
      name: "Expired Token User",
      phone: "+251911000005",
      role: "user",
      telegramId: "tg_token_5",
    });

    // Issue token with -10 second TTL (already expired)
    const { token } = await issueOnboardingToken(user.id, { expiresInSeconds: -10 });

    const validation = await validateOnboardingToken(token);
    expect(validation.valid).toBe(false);

    await expect(consumeOnboardingToken(token)).rejects.toThrow(/expired|invalid/i);
  });

  it("proves forged or tampered tokens are rejected", async () => {
    const forgedToken = "completely_random_or_tampered_token_string";

    const validation = await validateOnboardingToken(forgedToken);
    expect(validation.valid).toBe(false);

    await expect(consumeOnboardingToken(forgedToken)).rejects.toThrow(/invalid/i);
  });

  it("proves tokens are cascade-deleted when account is removed", async () => {
    const user = await createAccount({
      name: "Cascade Token User",
      phone: "+251911000006",
      role: "user",
    });

    const { token } = await issueOnboardingToken(user.id);
    expect((await validateOnboardingToken(token)).valid).toBe(true);

    // Delete the account
    await testDb.db.delete(accounts).where(eq(accounts.id, user.id));

    // Token must no longer exist / be valid
    const validation = await validateOnboardingToken(token);
    expect(validation.valid).toBe(false);
  });
});
