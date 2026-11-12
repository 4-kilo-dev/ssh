/**
 * Onboarding deep-link token management.
 *
 * Provides single-use, cryptographically signed, short-lived tokens for
 * onboarding users arriving from the Telegram bot.
 */
import { getDb } from "@/lib/db/client";
import { onboardingTokens, type OnboardingToken } from "@/lib/db/schema";
import { randomBytes, createHmac } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";

const SECRET = process.env.AUTH_SECRET ?? "dev_secret_addisvenue_local_key_only";
const DEFAULT_TTL_SECONDS = 900; // 15 minutes

export interface IssueTokenOptions {
  expiresInSeconds?: number;
}

export interface ValidateTokenResult {
  valid: boolean;
  accountId?: string;
  reason?: string;
}

/**
 * Issues a cryptographically signed onboarding token for a given account.
 */
export async function issueOnboardingToken(
  accountId: string,
  options?: IssueTokenOptions
): Promise<OnboardingToken> {
  const db = getDb();
  const ttl = options?.expiresInSeconds ?? DEFAULT_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  // Generate random bytes and an HMAC signature
  const rawBytes = randomBytes(24).toString("hex");
  const signature = createHmac("sha256", SECRET).update(rawBytes).digest("hex").slice(0, 16);
  const token = `${rawBytes}_${signature}`;

  const [record] = await db
    .insert(onboardingTokens)
    .values({
      accountId,
      token,
      expiresAt,
    })
    .returning();

  return record;
}

/**
 * Validates whether an onboarding token is legitimate, unexpired, and unused,
 * without consuming it (useful for rendering the password form).
 */
export async function validateOnboardingToken(token: string): Promise<ValidateTokenResult> {
  if (!token || typeof token !== "string" || !token.includes("_")) {
    return { valid: false, reason: "Malformed token" };
  }

  const [rawBytes, signature] = token.split("_");
  const expectedSig = createHmac("sha256", SECRET).update(rawBytes).digest("hex").slice(0, 16);
  if (signature !== expectedSig) {
    return { valid: false, reason: "Invalid signature" };
  }

  const db = getDb();
  const [record] = await db
    .select()
    .from(onboardingTokens)
    .where(eq(onboardingTokens.token, token))
    .limit(1);

  if (!record) {
    return { valid: false, reason: "Token not found" };
  }

  if (record.usedAt) {
    return { valid: false, reason: "Token already used" };
  }

  if (new Date() > record.expiresAt) {
    return { valid: false, reason: "Token expired" };
  }

  return { valid: true, accountId: record.accountId };
}

/**
 * Atomically validates and consumes an onboarding token.
 * Throws an error if invalid, expired, or already used.
 */
export async function consumeOnboardingToken(token: string): Promise<{ accountId: string }> {
  const validation = await validateOnboardingToken(token);
  if (!validation.valid || !validation.accountId) {
    throw new Error(validation.reason ?? "Invalid onboarding token");
  }

  const db = getDb();
  const now = new Date();

  // Atomically mark the token as used where it has not been used yet
  const [updated] = await db
    .update(onboardingTokens)
    .set({ usedAt: now })
    .where(and(eq(onboardingTokens.token, token), isNull(onboardingTokens.usedAt)))
    .returning();

  if (!updated) {
    throw new Error("Token already used");
  }

  return { accountId: updated.accountId };
}
