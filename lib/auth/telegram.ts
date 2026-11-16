import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

export type VerifiedTelegramUser = { id: number; first_name: string; last_name?: string; username?: string; language_code?: string; photo_url?: string };

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyTelegramInitData(initData: string): VerifiedTelegramUser {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userRaw = params.get("user");
  if (!receivedHash || !Number.isInteger(authDate) || !userRaw) throw new Error("Invalid Telegram authentication payload");
  if (Math.abs(Math.floor(Date.now() / 1000) - authDate) > MAX_INIT_DATA_AGE_SECONDS) throw new Error("Telegram authentication payload expired");
  const dataCheckString = [...params.entries()].filter(([key]) => key !== "hash").sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (!safeEqualHex(expectedHash, receivedHash)) throw new Error("Telegram authentication signature is invalid");
  try {
    const user = JSON.parse(userRaw) as VerifiedTelegramUser;
    if (!Number.isSafeInteger(user.id) || !user.first_name) throw new Error("Telegram user is missing");
    return user;
  } catch {
    throw new Error("Invalid Telegram user payload");
  }
}
