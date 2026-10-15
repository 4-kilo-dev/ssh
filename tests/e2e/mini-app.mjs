/**
 * Mini App (/tg) end-to-end suite at a 390px phone viewport.
 *
 * Covers the shell and bottom navigation, the filters bottom sheet, the
 * calendar, the booking and payment flow (success / pending / failure), the
 * admin round-trip through shared state, the contact-hiding rules, route
 * isolation, and Amharic rendering without horizontal overflow.
 *
 * WARNING: this suite clears localStorage on the target origin.
 */

import { baseUrl, launchBrowser, pageHelpers, preflight, recorder } from "./harness.mjs";

const BASE = baseUrl();
await preflight(BASE);
const { record, finish } = recorder("Mini App");
const { browser, context } = await launchBrowser({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const { goto, setField, waitForUrl } = pageHelpers(page, BASE);

const consoleErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200)); });

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const overflow = () => page.evaluate(() => ({
  sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
}));

// ── 0. clean slate ───────────────────────────────────────────────────────────
await page.goto(`${BASE}/tg`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.clear());
await goto("/tg", ".tg-bottomnav");

// ── 1. shell ─────────────────────────────────────────────────────────────────
record("shell: bottom nav visible", await page.locator(".tg-bottomnav").isVisible());
record("shell: web header absent", (await page.locator(".site-header").count()) === 0);
{
  const { sw, cw } = await overflow();
  record("shell: no horizontal overflow at 390px (en)", sw <= cw + 1, `scrollWidth=${sw} clientWidth=${cw}`);
}

// ── 2. demo payment-outcome selector inside /tg ──────────────────────────────
await goto("/tg/demo", "select#payment-outcome");
record("demo: payment-outcome selector present in /tg", await page.locator("select#payment-outcome").isVisible());
await page.selectOption("select#payment-outcome", "success");
await page.waitForTimeout(400);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
record("demo: outcome persists as success", (await page.locator("select#payment-outcome").inputValue()) === "success");

// ── 3. venue list + filters bottom sheet ─────────────────────────────────────
await goto("/tg/venues", ".tg-toolbar");
await page.waitForSelector(".venue-card", { timeout: 20000 });
const allVenues = await page.locator(".venue-card").count();
await page.getByRole("button", { name: /Filters/ }).click();
await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
record("venues: filters open in a bottom sheet (dialog)", await page.locator('[role="dialog"]').isVisible());
await page.selectOption("#tg-filter-area", "Yeka");
await page.waitForTimeout(300);
await page.getByRole("button", { name: /Apply filters/ }).click();
await page.waitForTimeout(500);
const filteredVenues = await page.locator(".venue-card").count();
record("venues: area filter narrows results", filteredVenues > 0 && filteredVenues < allVenues, `${allVenues} → ${filteredVenues}`);
record("venues: active filter chip shown", (await page.locator(".tg-chip.is-active").count()) > 0);

// ── 4. venue detail: compact calendar + contact hidden before deposit ────────
await goto("/tg/venues/venue-1", ".tg-calendar");
record("venue detail: compact calendar rendered", (await page.locator(".tg-calendar-day").count()) >= 28);
record("venue detail: agenda section present", (await page.locator(".tg-agenda-title").count()) > 0);
record("contact rules: venue contact HIDDEN before deposit", (await page.locator("body").innerText()).includes("Venue contact is hidden until"));
await page.locator(".tg-calendar-day:not([disabled])").first().click();
await page.waitForTimeout(400);
record("venue detail: selecting a date reveals the booking action", (await page.getByRole("button", { name: /Request booking/ }).count()) > 0);

// ── 5. booking request + sticky action at 390px ──────────────────────────────
await goto(`/tg/bookings/new?venue=venue-1&date=${future(30)}`, "#booking-guests");
await setField("#booking-guests", "60"); // venue-1 capacity is 80
await page.waitForSelector(".tg-sticky-action", { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(300);
record("booking: sticky primary action visible at 390px", await page.locator(".tg-sticky-action").isVisible());
{
  const sticky = (await page.locator(".tg-sticky-action button").innerText()).trim();
  const real = (await page.locator("[data-tg-primary]").innerText()).trim();
  record("booking: sticky action mirrors the real button label", sticky === real, `"${sticky}"`);
}
await page.locator(".tg-sticky-action button").click();
await waitForUrl(/bookings\/submitted/, "booking");
await page.waitForTimeout(700);
const bookingId = new URL(page.url()).searchParams.get("booking");
record("booking: request submitted, id captured", Boolean(bookingId), bookingId ?? "");

// ── 6. simulated Telebirr deposit — success → Reserved ──────────────────────
await page.locator(".tg-sticky-action button").click();
await waitForUrl(/payments\/deposit/, "deposit");
// Let the deposit screen mount before asserting on its sticky action.
await page.waitForSelector(".tg-sticky-action", { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(300);
record("payment: sticky action visible on deposit screen", await page.locator(".tg-sticky-action").isVisible());
record("payment: demo label present", (await page.locator("body").innerText()).includes("no real payment is processed"));
await page.locator(".tg-sticky-action button").click();
await waitForUrl(/payments\/success/, "success");
await page.waitForTimeout(900);
record("payment(success): booking is Reserved", (await page.locator("body").innerText()).includes("Reserved"));

// ── 7. same booking visible in /admin immediately ────────────────────────────
// /admin sits behind the demo role switcher, so preview as admin first.
await goto("/tg/demo", "select#preview-role");
await page.selectOption("select#preview-role", "admin");
await page.waitForTimeout(500);
await goto("/admin/bookings", ".responsive-table");
{
  record("admin: booking created in /tg appears in /admin", (await page.locator("body").innerText()).includes(bookingId ?? "\u0000"), bookingId ?? "");
  const row = page.locator(`tr:has-text("${bookingId}")`).first();
  record("admin: that booking shows as Reserved", (await row.innerText().catch(() => "")).includes("Reserved"));
}

// ── 8. contact rules: venue contact revealed after deposit ───────────────────
await goto("/tg/venues/venue-1", ".tg-calendar");
{
  const body = await page.locator("body").innerText();
  record("contact rules: venue contact REVEALED after deposit", !body.includes("Venue contact is hidden until") && body.includes("Sample venue contact"));
}

// ── 9. pending outcome keeps the date open ───────────────────────────────────
await goto("/tg/demo", "select#payment-outcome");
await page.selectOption("select#payment-outcome", "pending");
await page.waitForTimeout(400);
await goto(`/tg/bookings/new?venue=venue-2&date=${future(45)}`, "#booking-guests");
await setField("#booking-guests", "90");
await page.locator("[data-tg-primary]").click();
await waitForUrl(/bookings\/submitted/, "pending booking");
await page.locator("[data-tg-primary]").click();
await waitForUrl(/payments\/deposit/, "pending deposit");
await page.locator("[data-tg-primary]").click();
await waitForUrl(/payments\/failed/, "pending result");
await page.waitForTimeout(800);
record("payment(pending): booking stays Requested", (await page.locator("body").innerText()).includes("remains Requested"));

// ── 10. failure allows retry ─────────────────────────────────────────────────
await goto("/tg/demo", "select#payment-outcome");
await page.selectOption("select#payment-outcome", "failure");
await page.waitForTimeout(400);
await goto(`/tg/bookings/new?venue=venue-3&date=${future(60)}`, "#booking-guests");
await setField("#booking-guests", "85");
await page.locator("[data-tg-primary]").click();
await waitForUrl(/bookings\/submitted/, "failure booking");
await page.locator("[data-tg-primary]").click();
await waitForUrl(/payments\/deposit/, "failure deposit");
await page.locator("[data-tg-primary]").click();
await waitForUrl(/payments\/failed/, "failure result");
await page.waitForTimeout(800);
{
  const body = await page.locator("body").innerText();
  record("payment(failure): booking stays Requested", body.includes("did not succeed"));
  record("payment(failure): retry is offered", (await page.getByRole("button", { name: /Retry/ }).count()) > 0);
}

// ── 11. vendor contact hidden until acceptance ──────────────────────────────
await goto("/tg/vendors/vendor-1", ".vendor-profile-hero");
record("contact rules: vendor contact HIDDEN before acceptance", (await page.locator("body").innerText()).includes("shared only after the vendor accepts"));
await goto("/tg/inquiries/new?vendor=vendor-1", "#inquiry-detail");
await setField("#inquiry-date", future(50));
await setField("#inquiry-detail", "Automated check: please share your photography packages.");
await page.locator("[data-tg-primary], button[type=submit]").first().click();
await waitForUrl(/inquiries\/sent/, "inquiry");
record("inquiry: sent from /tg", /inquiries\/sent/.test(page.url()));

// The vendor confirms in the web vendor area; state is shared.
await goto("/tg/demo", "select#preview-role");
await page.selectOption("select#preview-role", "vendor");
await page.waitForTimeout(400);
await goto("/vendor/inquiries", ".stacked-list");
await page.locator(".inquiry-row a.btn").first().click();
await page.waitForSelector("#vendor-response", { timeout: 20000 });
await setField("#vendor-response", "Thanks — sending options for your date.");
await page.getByRole("button", { name: /Confirm inquiry/ }).click();
await page.waitForTimeout(900);
record("vendor: inquiry confirmed", (await page.locator("body").innerText()).includes("Confirmed"));

await goto("/tg/demo", "select#preview-role");
await page.selectOption("select#preview-role", "customer");
await page.waitForTimeout(400);
await goto("/tg/vendors/vendor-1", ".vendor-profile-hero");
record("contact rules: vendor contact REVEALED after acceptance", !(await page.locator("body").innerText()).includes("shared only after the vendor accepts"));

// ── 12. vendor/admin routes unreachable from /tg ────────────────────────────
for (const routePath of ["/tg/vendor", "/tg/admin", "/tg/vendor/inquiries"]) {
  await goto(routePath, ".not-found");
  record(`unreachable from /tg: ${routePath}`, (await page.locator("body").innerText()).includes("customer screens only"));
}

// ── 13. Amharic at 390px — no horizontal overflow on any /tg screen ─────────
await goto("/tg?lang=am", ".tg-bottomnav");
const localeSettled = await page.waitForFunction(() => document.documentElement.lang === "am", null, { timeout: 10000 }).then(() => true).catch(() => false);
record("amharic: locale deep link applied and persists", localeSettled);
record("amharic: page text is actually Amharic", /[\u1200-\u137F]/.test(await page.locator("body").innerText()));
const screens = ["/tg", "/tg/venues", "/tg/venues/venue-1", "/tg/demo", "/tg/my-event", "/tg/my-bookings", "/tg/my-inquiries",
  "/tg/notifications", "/tg/profile", "/tg/sign-in", "/tg/vendors", "/tg/vendors/vendor-1", "/tg/bookings/new?venue=venue-1"];
for (const screen of screens) {
  await goto(screen);
  const { sw, cw } = await overflow();
  const lang = await page.locator("html").getAttribute("lang");
  const ethiopic = /[\u1200-\u137F]/.test(await page.locator("body").innerText());
  record(`amharic 390px: no overflow on ${screen}`, sw <= cw + 1 && lang === "am" && ethiopic,
    `scrollWidth=${sw} clientWidth=${cw} lang=${lang} ethiopic=${ethiopic}`);
}

await browser.close();
const uniqueErrors = [...new Set(consoleErrors)];
record("no React/console errors during the run", uniqueErrors.length === 0, uniqueErrors.slice(0, 2).join(" | "));
if (uniqueErrors.length) uniqueErrors.forEach((error) => console.log(`   ↳ ${error}`));
process.exit(finish() ? 0 : 1);
