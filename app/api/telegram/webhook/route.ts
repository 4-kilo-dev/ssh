import { NextResponse } from "next/server";
import { sendMiniAppWelcome, setupTelegramPassword } from "@/lib/telegram-bot";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number; type?: string };
    from?: { id?: number; first_name?: string; last_name?: string };
    text?: string;
    contact?: { user_id?: number; phone_number?: string };
  };
};

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const update = await req.json() as TelegramUpdate;
    const message = update.message;
    const chatId = message?.chat?.id;
    const userId = message?.from?.id;
    if (message?.chat?.type !== "private" || !chatId || !userId || chatId !== userId) {
      return NextResponse.json({ ok: true });
    }
    if (/^\/start(?:@\w+)?(?:\s|$)/.test(message.text || "")) {
      await sendMiniAppWelcome(chatId);
    } else if (message.contact?.user_id === userId && message.contact.phone_number) {
      const name = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
      await setupTelegramPassword(chatId, userId, name, message.contact.phone_number);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to complete setup. Please try again." }, { status: 500 });
  }
}
