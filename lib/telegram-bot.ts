import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAccountByPhone, getAccountByTelegramId, hasCredentials } from "@/lib/services/account-service";
import { issueOnboardingToken } from "@/lib/auth/tokens";

const TELEGRAM_API = "https://api.telegram.org/bot";

async function callTelegram(method: string, body: Record<string, unknown>): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`${TELEGRAM_API}${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json() as { ok: boolean };
  if (!response.ok || !result.ok) throw new Error("Telegram request failed");
}

function appUrl() {
  const url = new URL(process.env.TELEGRAM_WEBAPP_URL || "");
  if (url.protocol !== "https:") throw new Error("TELEGRAM_WEBAPP_URL must be HTTPS");
  return url;
}

export async function sendMiniAppWelcome(chatId: number | string): Promise<void> {
  const url = appUrl().href;
  await callTelegram("setChatMenuButton", { chat_id: chatId, menu_button: { type: "web_app", text: "Open Addis Gathering", web_app: { url } } });
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: "Welcome to Addis Gathering. Share your own phone number below to set up a password for the website and mobile app. Enter your password only on the secure setup page.",
    reply_markup: { keyboard: [[{ text: "Share my phone number", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
  });
  await callTelegram("sendMessage", { chat_id: chatId, text: "You can also explore venues now.", reply_markup: { inline_keyboard: [[{ text: "Open Addis Gathering", web_app: { url } }]] } });
}

export async function setupTelegramPassword(chatId: number, userId: number, name: string, rawPhone: string): Promise<void> {
  const phone = "+" + rawPhone.replace(/[^0-9]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Invalid shared phone number");
  const telegramId = String(userId);
  let account = await getAccountByTelegramId(telegramId);
  const owner = await getAccountByPhone(phone);
  if (owner && owner.id !== account?.id) {
    await callTelegram("sendMessage", { chat_id: chatId, text: "This phone number already has an account. Sign in on the website with its existing password. Contact support to link your Telegram account.", reply_markup: { remove_keyboard: true } });
    return;
  }
  if (account && (!account.isActive || (!account.phone.startsWith("telegram:") && account.phone !== phone))) {
    await callTelegram("sendMessage", { chat_id: chatId, text: "Please contact support to update this account's phone number." });
    return;
  }
  const db = getDb();
  if (!account) {
    await db.insert(accounts).values({ name, phone, role: "user", telegramId }).onConflictDoNothing();
    account = await getAccountByTelegramId(telegramId);
    if (!account || account.phone !== phone) throw new Error("Account changed. Please try /start again.");
  } else if (account.phone.startsWith("telegram:")) {
    await db.update(accounts).set({ phone }).where(eq(accounts.id, account.id));
  }
  if (await hasCredentials(account.id)) {
    await callTelegram("sendMessage", { chat_id: chatId, text: `Your password is already set. Sign in on the website or mobile app using ${phone} and your password.`, reply_markup: { remove_keyboard: true } });
    return;
  }
  const token = await issueOnboardingToken(account.id);
  const url = new URL("/onboard", appUrl());
  url.searchParams.set("token", token.token);
  await callTelegram("sendMessage", { chat_id: chatId, text: `Create your password using the button below. This private link expires in 15 minutes. Then sign in on the website or mobile app with ${phone} and that password. Send /start for a new link.`, reply_markup: { inline_keyboard: [[{ text: "Create password", url: url.href }]] } });
}
