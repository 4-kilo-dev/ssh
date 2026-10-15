/**
 * Telegram integration suite.
 *
 * Blocks the real telegram-web-app.js and injects a spy double, so the tests
 * can assert on ready(), expand(), the BackButton, the MainButton and Telegram
 * sign-in without a Telegram client. A second, clean browser context checks the
 * plain-browser fallbacks.
 */

import { baseUrl, launchBrowser, loadPlaywright, preflight, recorder, resolveChromePath } from "./harness.mjs";

const BASE = baseUrl();
await preflight(BASE);
const { record, finish } = recorder("Telegram");

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

// Pretend to be a Telegram client: block the CDN script and provide the API.
await context.route("**/telegram-web-app.js", (route) => route.abort());
await context.addInitScript(() => {
  const calls = [];
  window.__tgCalls = calls;
  const makeButton = (name) => ({
    isVisible: false, text: "", isActive: true, _cb: null,
    show() { this.isVisible = true; calls.push(`${name}.show`); },
    hide() { this.isVisible = false; calls.push(`${name}.hide`); },
    onClick(callback) { this._cb = callback; calls.push(`${name}.onClick`); },
    offClick() { calls.push(`${name}.offClick`); },
    setText(text) { this.text = text; calls.push(`${name}.setText:${text}`); },
    enable() { this.isActive = true; calls.push(`${name}.enable`); },
    disable() { this.isActive = false; calls.push(`${name}.disable`); },
  });
  window.Telegram = {
    WebApp: {
      initData: "query_id=fake&hash=fake",
      initDataUnsafe: { user: { id: 42, first_name: "Abebe", last_name: "Kebede", username: "abebe" } },
      version: "7.0", platform: "ios", isExpanded: false, viewportHeight: 780, viewportStableHeight: 780,
      ready() { calls.push("ready"); },
      expand() { calls.push("expand"); },
      close() {},
      onEvent() {},
      offEvent() {},
      BackButton: makeButton("BackButton"),
      MainButton: makeButton("MainButton"),
      setHeaderColor(color) { calls.push(`setHeaderColor:${color}`); },
      setBackgroundColor(color) { calls.push(`setBackgroundColor:${color}`); },
    },
  };
});

const page = await context.newPage();
const goto = async (routePath, waitFor) => {
  await page.goto(`${BASE}${routePath}`, { waitUntil: "domcontentloaded" });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 20000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(700);
};
const calls = () => page.evaluate(() => window.__tgCalls.slice());
const backVisible = () => page.evaluate(() => window.Telegram.WebApp.BackButton.isVisible);
const mainVisible = () => page.evaluate(() => window.Telegram.WebApp.MainButton.isVisible);
const mainText = () => page.evaluate(() => window.Telegram.WebApp.MainButton.text);

await page.goto(`${BASE}/tg`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.clear());

// ── boot ─────────────────────────────────────────────────────────────────────
await goto("/tg", ".tg-bottomnav");
{
  const list = await calls();
  record("sdk: ready() called", list.includes("ready"));
  record("sdk: expand() called", list.includes("expand"));
  record("sdk: header/background set to our own palette", list.includes("setHeaderColor:#f7f7f3") && list.includes("setBackgroundColor:#f7f7f3"));
  const viewportVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--tg-viewport-height").trim());
  record("sdk: viewport height bound to a CSS variable", viewportVar === "780px", viewportVar);
}
record("back button: hidden on a root tab (Home)", (await backVisible()) === false);
await goto("/tg/venues/venue-1", ".tg-calendar");
record("back button: shown on a pushed screen (venue detail)", (await backVisible()) === true);
await goto("/tg/venues", ".tg-toolbar");
record("back button: hidden again on the Venues tab", (await backVisible()) === false);

// ── MainButton mirrors the booking primary action ────────────────────────────
const date = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
await goto(`/tg/bookings/new?venue=venue-1&date=${date}`, "#booking-guests");
record("main button: visible on the booking screen", (await mainVisible()) === true);
record("main button: text mirrors the primary action", (await mainText()) === "Submit", await mainText());
record("main button: in-page sticky bar suppressed inside Telegram", (await page.locator(".tg-sticky-action").count()) === 0);

// ── MainButton actually drives the flow ──────────────────────────────────────
await page.fill("#booking-guests", "60");
await page.waitForTimeout(600);
const handlerRegistered = await page.evaluate(() => {
  const button = window.Telegram.WebApp.MainButton;
  if (!button._cb) return false;
  button._cb();
  return true;
});
record("main button: click handler registered", handlerRegistered);
await page.waitForURL(/bookings\/submitted/, { timeout: 20000 }).catch(() => {});
record("main button: tapping it submits the booking", /bookings\/submitted/.test(page.url()), page.url());

// ── Telegram sign-in uses real user data ─────────────────────────────────────
await goto("/tg/sign-in", ".card");
{
  const body = await page.locator("body").innerText();
  // .eyebrow applies text-transform: uppercase, so compare case-insensitively.
  record("sign-in: Telegram account block shown", /telegram account detected/i.test(body) && body.includes("Abebe Kebede"));
  record("sign-in: username surfaced", body.includes("@abebe"));
}
await page.getByRole("button", { name: /Continue with Telegram/ }).click();
await page.waitForURL(/\/tg$/, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(900);
record("sign-in: greeting uses the Telegram name", (await page.locator("body").innerText()).includes("Abebe"));

// ── no Telegram → in-page fallbacks ─────────────────────────────────────────
const plain = await browser.newContext({ viewport: { width: 390, height: 844 } });
const plainPage = await plain.newPage();
await plainPage.goto(`${BASE}/tg/bookings/new?venue=venue-1`, { waitUntil: "domcontentloaded" });
await plainPage.waitForSelector("#booking-guests", { timeout: 20000 });
await plainPage.waitForSelector(".tg-sticky-action", { timeout: 20000 }).catch(() => {});
record("browser fallback: sticky action rendered instead of MainButton", (await plainPage.locator(".tg-sticky-action").count()) === 1);
await plainPage.goto(`${BASE}/tg/sign-in`, { waitUntil: "domcontentloaded" });
await plainPage.waitForTimeout(1200);
record("browser fallback: sign-in shows the mock phone/OTP form", (await plainPage.locator("body").innerText()).includes("Not opened inside Telegram"));

await browser.close();
process.exit(finish() ? 0 : 1);
