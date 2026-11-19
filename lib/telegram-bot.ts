import { getDb } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAccountByPhone, getAccountByTelegramId, hasCredentials } from "@/lib/services/account-service";

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

export async function sendMiniAppWelcome(chatId: number | string, userId?: number, name = ""): Promise<void> {
  const url = appUrl().href;
  await callTelegram("setChatMenuButton", { chat_id: chatId, menu_button: { type: "web_app", text: "Open Addis Gathering", web_app: { url } } });
  const account = userId ? await getAccountByTelegramId(String(userId)) : null;
  if (!account || account.phone.startsWith("telegram:")) {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "Before we finish your account, please share your phone number. Telegram will ask for your permission first.",
      reply_markup: { keyboard: [[{ text: "Share my phone number", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    });
    return;
  }
  const needsPassword = !account || !(await hasCredentials(account.id));
  if (needsPassword) {
    const setupUrl = new URL("/tg", url);
    setupUrl.searchParams.set("setup", "password");
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: `Welcome${name ? `, ${name}` : ""}! Create a password to secure your Addis Gathering account. The password is entered inside the Mini App, not in this chat.`,
      reply_markup: { inline_keyboard: [[{ text: "Create my password", web_app: { url: setupUrl.href } }]] },
    });
    return;
  }
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text: "Welcome back to Addis Gathering. Your account is ready.",
    reply_markup: { inline_keyboard: [[{ text: "Open Addis Gathering", web_app: { url } }]] },
  });
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
  const url = new URL("/tg", appUrl());
  url.searchParams.set("setup", "password");
  await callTelegram("sendMessage", { chat_id: chatId, text: "Your phone number is saved. Create your password inside the Addis Gathering Mini App.", reply_markup: { remove_keyboard: true } });
  await callTelegram("sendMessage", { chat_id: chatId, text: "Create your password to finish setting up your account.", reply_markup: { inline_keyboard: [[{ text: "Create my password", web_app: { url } }]] } });
}
