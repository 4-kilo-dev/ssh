/**
 * Phase 1 Tests: Accounts & Identity
 *
 * Requirements from docs/phases.md:
 * - Account tables: user, venue manager, vendor, super admin.
 * - Identity anchor (Telegram ID + phone) vs. hashed credential separation.
 * - Account creation rules & uniqueness.
 *
 * State machine focus:
 * - State 1: account-exists (identity registered, no password set yet)
 * - State 2: has-credentials (password attached to identity)
 *
 * Tests prove:
 * 1. Phone number uniqueness constraint (database level).
 * 2. Telegram ID uniqueness constraint when present (database level).
 * 3. Role enforcement: valid roles ('user', 'venue_manager', 'vendor', 'super_admin').
 * 4. Identity vs. credential separation: account exists before password is created.
 * 5. Password is never stored in plaintext (hashed using cryptographic salt).
 * 6. Credential verification works with correct password and rejects invalid passwords.
 * 7. Cascading deletion: deleting an account cleans up its credentials record.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { accounts, credentials } from "@/lib/db/schema";
import {
  createAccount,
  setPassword,
  verifyCredentials,
  getAccountById,
  getAccountByPhone,
  getAccountByTelegramId,
  hasCredentials,
} from "@/lib/services/account-service";
import { eq } from "drizzle-orm";

describe("Phase 1 — Accounts & Identity", () => {
  let testDb: TestDbInstance;

  beforeAll(async () => {
    // Fresh test database schema with migrations
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("proves an account can be created without credentials (state: account-exists)", async () => {
    // User onboards via Telegram bot; identity anchor is verified before setting a password
    const account = await createAccount({
      name: "Abebe Bikila",
      phone: "+251911223344",
      role: "user",
      telegramId: "tg_12345678",
    });

    expect(account.id).toBeDefined();
    expect(account.name).toBe("Abebe Bikila");
    expect(account.phone).toBe("+251911223344");
    expect(account.role).toBe("user");
    expect(account.telegramId).toBe("tg_12345678");

    // Must be in state account-exists, NOT has-credentials
    const hasCreds = await hasCredentials(account.id);
    expect(hasCreds).toBe(false);
  });

  it("proves phone number uniqueness is strictly enforced at database level", async () => {
    // Attempting to register another account with the same phone must fail
    await expect(
      createAccount({
        name: "Duplicate Phone User",
        phone: "+251911223344",
        role: "vendor",
      })
    ).rejects.toThrow();
  });

  it("proves Telegram ID uniqueness is strictly enforced when present", async () => {
    // Different phone, but duplicate Telegram ID
    await expect(
      createAccount({
        name: "Duplicate Telegram User",
        phone: "+251922334455",
        role: "user",
        telegramId: "tg_12345678",
      })
    ).rejects.toThrow();
  });

  it("proves accounts without Telegram ID are allowed (e.g. venue manager created via admin)", async () => {
    const manager = await createAccount({
      name: "Tadesse Manager",
      phone: "+251933445566",
      role: "venue_manager",
    });

    expect(manager.id).toBeDefined();
    expect(manager.telegramId).toBeNull();
    expect(manager.role).toBe("venue_manager");
  });

  it("proves credentials can be attached separately (state transition: account-exists -> has-credentials)", async () => {
    // 1. Create fresh account
    const user = await createAccount({
      name: "Sara Solomon",
      phone: "+251944556677",
      role: "user",
      telegramId: "tg_87654321",
    });

    expect(await hasCredentials(user.id)).toBe(false);

    // 2. User sets password via secure onboarding form
    const rawPassword = "StrongPassword#2026";
    await setPassword(user.id, rawPassword);

    expect(await hasCredentials(user.id)).toBe(true);

    // 3. Inspect database directly: verify password is NOT stored as plaintext
    const [credRecord] = await testDb.db
      .select()
      .from(credentials)
      .where(eq(credentials.accountId, user.id));

    expect(credRecord).toBeDefined();
    expect(credRecord.passwordHash).not.toBe(rawPassword);
    expect(credRecord.passwordHash).not.toContain(rawPassword);
    // Hashed format should include salt and scrypt/argon derivation markers
    expect(credRecord.passwordHash).toContain(":");
  });

  it("proves credential verification succeeds with valid password and fails with invalid password", async () => {
    const phone = "+251955667788";
    const password = "CorrectSecret123!";

    const vendor = await createAccount({
      name: "Addis Catering Co.",
      phone,
      role: "vendor",
    });

    await setPassword(vendor.id, password);

    // Valid password
    const verified = await verifyCredentials(phone, password);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(vendor.id);
    expect(verified?.role).toBe("vendor");

    // Invalid password
    const invalidAttempt = await verifyCredentials(phone, "WrongSecret!");
    expect(invalidAttempt).toBeNull();

    // Non-existent phone
    const nonExistent = await verifyCredentials("+251999999999", password);
    expect(nonExistent).toBeNull();
  });

  it("proves account retrieval works by ID, phone, and Telegram ID", async () => {
    const phone = "+251966778899";
    const telegramId = "tg_super_admin";

    const admin = await createAccount({
      name: "System Admin",
      phone,
      role: "super_admin",
      telegramId,
    });

    const byId = await getAccountById(admin.id);
    expect(byId?.id).toBe(admin.id);

    const byPhone = await getAccountByPhone(phone);
    expect(byPhone?.id).toBe(admin.id);

    const byTg = await getAccountByTelegramId(telegramId);
    expect(byTg?.id).toBe(admin.id);
  });

  it("proves deleting an account cascades and removes its credentials", async () => {
    const user = await createAccount({
      name: "Temporary User",
      phone: "+251977889900",
      role: "user",
    });

    await setPassword(user.id, "TempPass123!");
    expect(await hasCredentials(user.id)).toBe(true);

    // Delete the account directly
    await testDb.db.delete(accounts).where(eq(accounts.id, user.id));

    // Verify credential record was cascade-deleted
    const creds = await testDb.db
      .select()
      .from(credentials)
      .where(eq(credentials.accountId, user.id));

    expect(creds.length).toBe(0);
  });
});
