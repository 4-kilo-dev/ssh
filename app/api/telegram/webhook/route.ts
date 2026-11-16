import { NextResponse } from "next/server";
import { sendMiniAppWelcome } from "@/lib/telegram-bot";

type TelegramUpdate = { message?: { chat?: { id?: number | string }; text?: string } };

export async function POST(req: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const update = await req.json() as TelegramUpdate;
    const message = update.message;
    const chatId = message?.chat?.id;
    if (message && chatId !== undefined && /^\/start(?:\s|$)/.test(message.text || "")) await sendMiniAppWelcome(chatId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram webhook failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
