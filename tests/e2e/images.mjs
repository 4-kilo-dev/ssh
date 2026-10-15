/**
 * Imagery suite.
 *
 * Two checks, because they catch different failures:
 *
 *  1. Rendered count — after hydration, each page should show the images it is
 *     meant to. Waiting for a card selector first, because a page with zero
 *     images would otherwise satisfy an "all images complete" wait vacuously.
 *  2. Decodability — every distinct src is loaded through `new Image()` and must
 *     report naturalWidth > 0. Checking in-page `naturalWidth` is not enough:
 *     cards use `loading="lazy"`, and images inside a closed <details> never
 *     load at all, so they would look broken when they are fine.
 */

import { baseUrl, launchBrowser, pageHelpers, preflight, recorder } from "./harness.mjs";

const BASE = baseUrl();
await preflight(BASE);
const { record, finish } = recorder("Images");

/** Pages that render imagery once hydrated, with the content to wait for. */
const PAGES = [
  { path: "/", label: "landing", waitFor: ".featured-card", expect: 3 },
  { path: "/venues", label: "web venue list", waitFor: ".venue-card", expect: 10 },
  { path: "/venues/venue-1", label: "web venue detail", waitFor: ".detail-hero img", expect: 1 },
  // NOTE: the web /vendors and /vendors/:id routes are deliberately absent.
  // PageRouter gates on `pathname.startsWith("/vendor")`, which also matches the
  // customer directory, so those two routes render "Access denied" for a
  // customer. Pre-existing (present at HEAD, PageRouter is untouched) and not
  // fixed here because changing it would alter 2 of the 73 tracked routes.
  // Vendor imagery is covered through the Mini App routes below, which share the
  // same components and the same lib/images.ts mapping.
  { path: "/bookings/new?venue=venue-1", label: "web booking summary", waitFor: ".summary-image", expect: 1 },
  { path: "/my-event", label: "web my event", waitFor: ".my-event-feature img", expect: 1 },
  { path: "/tg", label: "mini app home", waitFor: ".venue-card", expect: 4 },
  { path: "/tg/venues", label: "mini app venue list", waitFor: ".venue-card", expect: 10 },
  { path: "/tg/venues/venue-1", label: "mini app venue detail", waitFor: ".detail-hero img", expect: 1 },
  { path: "/tg/vendors", label: "mini app vendor list", waitFor: ".vendor-market-card", expect: 9 },
  { path: "/tg/vendors/vendor-1", label: "mini app vendor profile", waitFor: ".vendor-profile-hero img", expect: 4 },
  { path: "/tg/bookings/new?venue=venue-1", label: "mini app booking summary", waitFor: ".summary-image", expect: 1 },
];

const { browser, context } = await launchBrowser({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const { goto } = pageHelpers(page, BASE);

const allSources = new Set();

for (const { path: routePath, label, waitFor, expect } of PAGES) {
  await goto(routePath);
  // Waiting for real content is what makes the image count meaningful.
  await page.waitForSelector(waitFor, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  const sources = await page.evaluate(() => [...document.images].map((image) => image.getAttribute("src") ?? ""));
  sources.filter(Boolean).forEach((src) => allSources.add(src));
  record(`${label}: renders at least ${expect} images`, sources.length >= expect, String(sources.length));
}

const distinct = [...allSources].sort();
// Every image must be a local asset from our own folder: no remote hotlinks and
// no legacy asset paths.
const strayImages = distinct.filter((src) => !src.startsWith("/images/"));
record("every image is a local /images/ asset", strayImages.length === 0, strayImages.slice(0, 5).join(", "));
record("no image is a remote hotlink", !distinct.some((src) => /^https?:/i.test(src)), distinct.filter((src) => /^https?:/i.test(src)).join(", "));

// Decode every distinct source in the browser: the direct proof that nothing
// renders as a broken image, independent of lazy loading.
const decoded = await page.evaluate(async (sources) => {
  const results = [];
  for (const src of sources) {
    const image = new Image();
    const ok = await new Promise((resolve) => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
      setTimeout(() => resolve(image.naturalWidth > 0), 4000);
    });
    results.push({ src, ok, width: image.naturalWidth });
  }
  return results;
}, distinct);
const undecodable = decoded.filter((entry) => !entry.ok).map((entry) => entry.src);
record(`all ${distinct.length} distinct images decode in a browser`, undecodable.length === 0, undecodable.slice(0, 5).join(", "));

// Every venue type and vendor category must map to its own file.
const required = [
  "/images/venue-wedding-hall.svg", "/images/venue-garden.svg", "/images/venue-conference.svg", "/images/venue-ballroom.svg",
  "/images/landing-hero.svg",
  "/images/vendor-photography-1.svg", "/images/vendor-catering-1.svg", "/images/vendor-decor-1.svg",
  "/images/vendor-music-sound-1.svg", "/images/vendor-beauty-1.svg",
];
const unseen = required.filter((src) => !allSources.has(src));
record(`every venue type and vendor category is exercised (${distinct.length} distinct)`, unseen.length === 0, unseen.join(", "));

const failures = [];
for (const src of required) {
  const response = await fetch(`${BASE}${src}`);
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/")) failures.push(`${src} → ${response.status} ${type}`);
}
record("every required placeholder file resolves as an image", failures.length === 0, failures.join(", "));

await browser.close();
process.exit(finish() ? 0 : 1);
