/**
 * Account service — core business logic for accounts & identity management.
 *
 * Implements identity-vs-credential separation:
 * - Identity anchor: phone number + optional Telegram ID.
 * - Credentials: stored in a separate table, hashed via scrypt.
 */
import { getDb } from "@/lib/db/client";
import {
  accounts,
  credentials,
  type Account,
  type AccountRole,
  type Credential,
} from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { eq } from "drizzle-orm";

export interface CreateAccountInput {
  name: string;
  phone: string;
  role: AccountRole;
  telegramId?: string | null;
}

/**
 * Creates a new account in the system (state: account-exists).
 * Enforces phone uniqueness and optional Telegram ID uniqueness at DB level.
 */
export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const db = getDb();
  const normalizedPhone = input.phone.trim();
  const normalizedTg = input.telegramId?.trim() ?? null;

  const [created] = await db
    .insert(accounts)
    .values({
      name: input.name.trim(),
      phone: normalizedPhone,
      role: input.role,
      telegramId: normalizedTg,
    })
    .returning();

  return created;
}

/**
 * Attaches or updates a password credential for an existing account
 * (state transition: account-exists -> has-credentials).
 */
export async function setPassword(accountId: string, rawPassword: string): Promise<Credential> {
  const db = getDb();

  // Verify account exists
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) {
    throw new Error(`Account with id ${accountId} not found`);
  }

  const passwordHash = await hashPassword(rawPassword);

  const [saved] = await db
    .insert(credentials)
    .values({
      accountId,
      passwordHash,
    })
    .onConflictDoUpdate({
      target: credentials.accountId,
      set: {
        passwordHash,
        updatedAt: new Date(),
      },
    })
    .returning();

  return saved;
}

/**
 * Checks whether an account has credentials attached.
 */
export async function hasCredentials(accountId: string): Promise<boolean> {
  const db = getDb();
  const [cred] = await db
    .select({ id: credentials.id })
    .from(credentials)
    .where(eq(credentials.accountId, accountId))
    .limit(1);

  return Boolean(cred);
}

/**
 * Verifies phone + password credentials.
 * Returns the matching Account if credentials are valid, or null otherwise.
 */
export async function verifyCredentials(
  phone: string,
  rawPassword: string
): Promise<Account | null> {
  const db = getDb();
  const normalizedPhone = phone.trim();

  // Find active account by phone
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.phone, normalizedPhone))
    .limit(1);

  if (!account || !account.isActive) {
    return null;
  }

  // Retrieve credentials
  const [cred] = await db
    .select()
    .from(credentials)
    .where(eq(credentials.accountId, account.id))
    .limit(1);

  if (!cred) {
    return null;
  }

  const isValid = await verifyPassword(rawPassword, cred.passwordHash);
  if (!isValid) {
    return null;
  }

  return account;
}

/**
 * Retrieves an account by its unique ID.
 */
export async function getAccountById(id: string): Promise<Account | null> {
  const db = getDb();
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return account ?? null;
}

/**
 * Retrieves an account by its unique phone number.
 */
export async function getAccountByPhone(phone: string): Promise<Account | null> {
  const db = getDb();
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.phone, phone.trim()))
    .limit(1);
  return account ?? null;
}

/**
 * Retrieves an account by its unique Telegram ID.
 */
export async function getAccountByTelegramId(telegramId: string): Promise<Account | null> {
  const db = getDb();
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.telegramId, telegramId.trim()))
    .limit(1);
  return account ?? null;
}
