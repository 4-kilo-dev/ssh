import { beforeAll, afterAll, afterEach, expect, it, vi } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { POST as webhook } from "@/app/api/telegram/webhook/route";
import { POST as activate } from "@/app/api/auth/onboard/set-password/route";
import { POST as login } from "@/app/api/auth/login/route";
import { createAccount, getAccountByTelegramId, setPassword } from "@/lib/services/account-service";
let database: TestDbInstance;
beforeAll(async () => { database = await setupTestDatabase(); });
afterAll(async () => { await database.cleanup(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function request(body: unknown, headers = {}) {
  return new Request("https://example.test/api", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}
function setup() {
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "test-secret");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_WEBAPP_URL", "https://example.test/tg");
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ ok: true }))));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
it("upgrades an existing Telegram account and enables the same web and mobile login", async () => {
  const calls = setup();
  const original = await createAccount({ name: "Telegram user", phone: "telegram:12345", telegramId: "12345", role: "user" });
  const response = await webhook(request({ message: { chat: { id: 12345, type: "private" }, from: { id: 12345, first_name: "User" }, contact: { user_id: 12345, phone_number: "251911123456" } } }, { "x-telegram-bot-api-secret-token": "test-secret" }));
  expect(response.status).toBe(200);
  const message = calls.mock.calls.map((c: any) => JSON.parse(c[1].body)).find((m: any) => m.reply_markup?.inline_keyboard);
  expect(message.reply_markup.inline_keyboard[0][0].web_app.url).toContain("/tg?setup=password");
  await setPassword(original.id, "StrongPassword123");
  for (const headers of [{}, { "x-addisvenue-client": "mobile" }]) {
    const signedIn = await login(request({ phone: "+251911123456", password: "StrongPassword123" }, headers));
    expect(signedIn.status).toBe(200);
    expect((await signedIn.json()).account.id).toBe(original.id);
  }
});
it("rejects untrusted webhooks and ignores another person's contact", async () => {
  const calls = setup();
  expect((await webhook(request({}))).status).toBe(401);
  await webhook(request({ message: { chat: { id: 54321, type: "private" }, from: { id: 54321 }, contact: { user_id: 999, phone_number: "251911000001" } } }, { "x-telegram-bot-api-secret-token": "test-secret" }));
  expect(calls).not.toHaveBeenCalled();
  expect(await getAccountByTelegramId("54321")).toBeNull();
});
