const TELEGRAM_API = "https://api.telegram.org/bot";

async function callTelegram<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`${TELEGRAM_API}${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram ${method} failed`);
  return result.result as T;
}

export async function sendMiniAppWelcome(chatId: number | string): Promise<void> {
  const webAppUrl = process.env.TELEGRAM_WEBAPP_URL;
  if (!webAppUrl || !webAppUrl.startsWith("https://")) throw new Error("TELEGRAM_WEBAPP_URL must be an HTTPS URL");
  await callTelegram("setChatMenuButton", { chat_id: chatId, menu_button: { type: "web_app", text: "Open Addis Gathering", web_app: { url: webAppUrl } } });
  await callTelegram("sendMessage", { chat_id: chatId, text: "Welcome to Addis Gathering. Open the Mini App to find venues, vendors, and manage your event.", reply_markup: { inline_keyboard: [[{ text: "Open Addis Gathering", web_app: { url: webAppUrl } }]] } });
}
