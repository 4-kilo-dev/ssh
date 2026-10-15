/**
 * Web route regression suite.
 *
 * Self-contained: the complete web route inventory is hardcoded below, so this
 * suite does not depend on any manifest file. For each route it extracts the
 * links the app renders plus its visible text, hashes the result, and compares
 * against the recorded baseline in baselines/web-routes.json. It also checks
 * that every locally-referenced image actually resolves, so a broken asset
 * fails the suite rather than silently rendering as a broken image.
 *
 *   node tests/e2e/web-routes.mjs             # verify
 *   node tests/e2e/web-routes.mjs --update    # re-record the baseline
 *
 * The normalised form deliberately ignores Next.js asset URLs and the RSC
 * payload, both of which differ per request/build and between dev and prod.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baseUrl, preflight, recorder } from "./harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.join(here, "baselines", "web-routes.json");
const BASE = baseUrl();
const update = process.argv.includes("--update");

/** Every web route the app answers, with concrete ids for dynamic segments. */
const WEB_ROUTES = [
  "/", "/venues", "/venues/venue-1", "/vendors",
  "/vendors/vendor-1", "/bookings/new", "/bookings/submitted", "/bookings/BK-2100",
  "/payments/deposit", "/payments/success", "/payments/failed", "/payments/receipt",
  "/inquiries/new", "/inquiries/sent", "/my-event", "/my-bookings",
  "/my-bookings/BK-2100", "/my-inquiries", "/my-inquiries/IN-3100", "/my-payments",
  "/saved", "/sign-in", "/verify-otp", "/profile/setup",
  "/profile", "/settings", "/notifications", "/about",
  "/faq", "/terms", "/privacy", "/contact",
  "/demo", "/vendor/sign-in", "/vendor/apply", "/vendor/application",
  "/vendor", "/vendor/profile", "/vendor/listing-preview", "/vendor/settings",
  "/vendor/notifications", "/vendor/inquiries", "/vendor/inquiries/IN-3100", "/vendor/fee-statements",
  "/vendor/fee-statements/FEE-5101", "/admin/login", "/admin", "/admin/bookings",
  "/admin/bookings/new", "/admin/bookings/BK-2100", "/admin/bookings/BK-2100/edit", "/admin/calendar",
  "/admin/venues", "/admin/venues/new", "/admin/venues/venue-1", "/admin/venues/venue-1/packages",
  "/admin/vendors", "/admin/vendors/vendor-1", "/admin/categories", "/admin/customers",
  "/admin/customers/customer-1", "/admin/inquiries", "/admin/inquiries/IN-3100", "/admin/payments",
  "/admin/payments/PAY-4101", "/admin/revenue", "/admin/reports", "/admin/reports/bookings",
  "/admin/users", "/admin/notifications", "/admin/settings", "/admin/audit",
  "/admin/content",
];
const EXPECTED_ROUTE_COUNT = 73;
const NON_IMAGE_ASSET_HINT = "/_next";

await preflight(BASE);
const { record, finish } = recorder("Web routes");
record(`route inventory holds ${EXPECTED_ROUTE_COUNT} routes`, WEB_ROUTES.length === EXPECTED_ROUTE_COUNT, String(WEB_ROUTES.length));
record("route inventory has no duplicates", new Set(WEB_ROUTES).size === WEB_ROUTES.length);

/** App links plus visible text, ignoring Next.js internals. */
function normalize(html) {
  const hrefs = [...html.matchAll(/href="([^"]*)"/g)]
    .map((match) => match[1])
    .filter((href) => !href.startsWith(NON_IMAGE_ASSET_HINT));
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return { hrefs: [...new Set(hrefs)].sort(), text };
}

const digest = (value) => createHash("sha256").update(value).digest("hex").slice(0, 16);

const current = {};
const missing = [];
const localImages = new Set();

for (const route of WEB_ROUTES) {
  const response = await fetch(`${BASE}${route}`);
  if (!response.ok) {
    missing.push(`${route} → HTTP ${response.status}`);
    continue;
  }
  const html = await response.text();
  const { hrefs, text } = normalize(html);
  current[route] = digest(`${hrefs.join("\n")}\n--\n${text}`);
  // Only <img> tags: script tags carry src="/_next/..." too.
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = /\bsrc="([^"]+)"/i.exec(tag[0])?.[1];
    if (src?.startsWith("/")) localImages.add(src);
  }
}

record("every route responds 200", missing.length === 0, missing.slice(0, 4).join(", "));

if (update) {
  mkdirSync(path.dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify({ base: BASE, routes: current }, null, 2)}\n`);
  console.log(`\nBaseline written to ${path.relative(process.cwd(), baselinePath)} (${Object.keys(current).length} routes)`);
} else if (!existsSync(baselinePath)) {
  record("baseline exists", false, "run with --update to record it");
} else {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")).routes ?? {};
  const changed = WEB_ROUTES.filter((route) => baseline[route] && baseline[route] !== current[route]);
  const added = WEB_ROUTES.filter((route) => !baseline[route]);
  record(`no route changed since the baseline (${WEB_ROUTES.length} compared)`, changed.length === 0,
    changed.length ? changed.slice(0, 6).join(", ") : `baseline ${path.relative(process.cwd(), baselinePath)}`);
  if (added.length) record("baseline covers every route", false, `${added.length} new: ${added.slice(0, 4).join(", ")}`);
}

// Locally referenced images must resolve, so nothing renders as a broken image.
const imageFailures = [];
for (const src of [...localImages].sort()) {
  const response = await fetch(`${BASE}${src}`);
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/")) {
    imageFailures.push(`${src} → HTTP ${response.status} ${type || "(no type)"}`);
  }
}
record(`all ${localImages.size} local images resolve as images`, imageFailures.length === 0, imageFailures.slice(0, 5).join(", "));

// Every image the app renders must come from our own asset folder.
const strayImages = [...localImages].filter((src) => !src.startsWith("/images/"));
record("every image is served from /images/", strayImages.length === 0, strayImages.join(", "));

process.exit(finish() ? 0 : 1);
