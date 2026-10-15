/**
 * Desktop preview frame suite (/tg-preview).
 *
 * The Mini App is driven by the same viewport-based media queries as the web
 * app, so a narrow container on a laptop would render desktop internals. This
 * suite proves the iframe approach works: inside the frame the viewport really
 * is phone-width and the multi-column desktop layouts collapse.
 */

import { baseUrl, launchBrowser, pageHelpers, preflight, recorder } from "./harness.mjs";

const BASE = baseUrl();
await preflight(BASE);
const { record, finish } = recorder("Preview");

// A laptop-sized window: the case the preview frame exists for.
const { browser, context } = await launchBrowser({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const { goto } = pageHelpers(page, BASE);

await goto("/tg-preview", ".tgpreview-frame");
record("preview: web chrome suppressed on the preview route", (await page.locator(".site-header").count()) === 0);

const frameBox = await page.locator(".tgpreview-frame").boundingBox();
record("preview: iframe is exactly phone width", Math.round(frameBox.width) === 390, `${Math.round(frameBox.width)}×${Math.round(frameBox.height)}`);

// Inside the frame the viewport is 390px, so media queries resolve as on a phone.
const frame = page.frames().find((candidate) => /\/tg(\/|\?|$)/.test(candidate.url()));
record("preview: /tg loaded inside the frame", Boolean(frame), frame?.url() ?? "no frame");
if (frame) {
  await frame.waitForSelector(".tg-bottomnav", { timeout: 20000 });
  const metrics = await frame.evaluate(() => ({
    innerWidth: window.innerWidth,
    hasBottomNav: Boolean(document.querySelector(".tg-bottomnav")),
    hasWebHeader: Boolean(document.querySelector(".site-header")),
    bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  record("preview: frame viewport is 390px", metrics.innerWidth === 390, String(metrics.innerWidth));
  record("preview: Mini App chrome rendered in the frame", metrics.hasBottomNav && !metrics.hasWebHeader);
  record("preview: no horizontal overflow inside the frame", metrics.bodyOverflow <= 1, `overflow=${metrics.bodyOverflow}`);

  await frame.goto(`${BASE}/tg/venues`, { waitUntil: "domcontentloaded" });
  await frame.waitForSelector(".venue-grid", { timeout: 20000 });
  await frame.waitForTimeout(900);
  const columns = await frame.evaluate(() => {
    // The web app renders this grid two-up above 560px; inside the frame it
    // must collapse to a single column.
    const grid = document.querySelector(".venue-grid");
    return {
      venueGrid: grid ? getComputedStyle(grid).gridTemplateColumns : "n/a",
      hasSheetTrigger: Boolean(document.querySelector(".tg-toolbar button")),
      webHeader: Boolean(document.querySelector(".site-header")),
    };
  });
  record("preview: venue grid collapses to one column inside the frame",
    columns.venueGrid.trim().split(/\s+/).length === 1, `gridTemplateColumns="${columns.venueGrid}"`);
  record("preview: Mini App uses the bottom-sheet filter trigger (not the web rail)",
    columns.hasSheetTrigger && !columns.webHeader);
}

// Switching the frame width re-sizes the viewport inside it.
await page.getByRole("button", { name: "430px" }).click();
await page.waitForTimeout(1200);
const wide = await page.locator(".tgpreview-frame").boundingBox();
record("preview: width preset resizes the frame", Math.round(wide.width) === 430, `${Math.round(wide.width)}px`);

await browser.close();
process.exit(finish() ? 0 : 1);
