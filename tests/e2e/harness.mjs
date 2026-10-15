/**
 * Shared harness for the browser test suites in this folder.
 *
 * These tests are deliberately not wired into `package.json`: they need
 * `playwright-core`, and adding it would change both package.json and
 * pnpm-lock.yaml. Instead the harness resolves it from, in order:
 *
 *   1. PLAYWRIGHT_CORE_PATH  — path to the module entry or package directory
 *   2. the project's own node_modules (if you choose to add it yourself)
 *   3. PLAYWRIGHT_CORE_DIR   — a node_modules/playwright-core directory
 *   4. ~/.cache/addis-e2e/node_modules/playwright-core
 *
 * See tests/e2e/README.md for the one-time install command.
 *
 * The suite needs a running server; point it elsewhere with BASE.
 */

import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const INSTALL_HINT = `
Could not load playwright-core.

Install it OUTSIDE this project so package.json and pnpm-lock.yaml stay untouched:

  mkdir -p ~/.cache/addis-e2e
  npm --prefix ~/.cache/addis-e2e install playwright-core

Then re-run. Alternatively point at an existing copy:

  PLAYWRIGHT_CORE_PATH=/path/to/playwright-core node tests/e2e/run-all.mjs

You also need a Chromium build. Playwright's cached browsers are auto-detected;
otherwise set CHROME_PATH, or run: npx --yes playwright install chromium
`.trim();

export const baseUrl = () => (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");

/** Locate a loadable playwright-core entry point. */
function resolvePlaywrightCoreEntry() {
  const candidates = [];

  if (process.env.PLAYWRIGHT_CORE_PATH) {
    const given = process.env.PLAYWRIGHT_CORE_PATH;
    if (existsSync(given)) {
      candidates.push(...(statSync(given).isDirectory() ? entriesIn(given) : [given]));
    }
  }

  try { candidates.push(require.resolve("playwright-core")); } catch { /* not a project dependency */ }

  const dirs = [process.env.PLAYWRIGHT_CORE_DIR, path.join(homedir(), ".cache", "addis-e2e", "node_modules", "playwright-core")];
  for (const dir of dirs) if (dir && existsSync(dir)) candidates.push(...entriesIn(dir));

  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

function entriesIn(dir) {
  const found = [];
  const pkgPath = path.join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      // Modern packages often declare only an `exports` map (playwright-core
      // does: no `main`, no `module`), so read that first.
      const root = pkg.exports?.["."] ?? pkg.exports;
      const fromExports = typeof root === "string"
        ? [root]
        : [root?.import, root?.require, root?.default].filter((value) => typeof value === "string");
      for (const rel of [...fromExports, pkg.module, pkg.main]) if (rel) found.push(path.join(dir, rel));
    } catch { /* fall through to the defaults below */ }
  }
  for (const rel of ["index.mjs", "index.js"]) found.push(path.join(dir, rel));
  return found;
}

export async function loadPlaywright() {
  const entry = resolvePlaywrightCoreEntry();
  if (!entry) {
    console.error(INSTALL_HINT);
    process.exit(2);
  }
  const loaded = await import(pathToFileURL(entry).href);
  const chromium = loaded.chromium ?? loaded.default?.chromium;
  if (!chromium) {
    console.error(`Loaded ${entry} but found no chromium export.\n\n${INSTALL_HINT}`);
    process.exit(2);
  }
  return { chromium };
}

/** Find a Chromium binary, preferring an explicit CHROME_PATH. */
export function resolveChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const roots = [
    path.join(homedir(), "Library", "Caches", "ms-playwright"),
    path.join(homedir(), ".cache", "ms-playwright"),
    path.join(homedir(), "AppData", "Local", "ms-playwright"),
  ];
  const executableNames = new Set(["Google Chrome for Testing", "Chromium", "chrome", "headless_shell", "chrome-headless-shell"]);

  for (const root of roots) {
    if (!existsSync(root)) continue;
    const revisions = readdirSync(root).filter((name) => name.startsWith("chromium")).sort().reverse();
    for (const revision of revisions) {
      const hit = searchForExecutable(path.join(root, revision), executableNames, 5);
      if (hit) return hit;
    }
  }
  return undefined;
}

function searchForExecutable(dir, names, depth) {
  if (depth < 0) return undefined;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return undefined; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && names.has(entry.name)) return full;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const hit = searchForExecutable(path.join(dir, entry.name), names, depth - 1);
    if (hit) return hit;
  }
  return undefined;
}

export async function launchBrowser({ viewport = { width: 390, height: 844 } } = {}) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  const context = await browser.newContext({ viewport });
  return { browser, context };
}

/** Fail fast with a clear message when the server is not running. */
export async function preflight(base = baseUrl()) {
  try {
    const response = await fetch(base, { method: "GET" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error(`\nCannot reach ${base} (${error.message}).\nStart the app first, e.g.:\n\n  next dev --hostname 0.0.0.0 --port 3000\n\nOr point the tests at another origin: BASE=http://host:port node tests/e2e/run-all.mjs\n`);
    process.exit(2);
  }
}

/** Collects pass/fail results and prints a summary. */
export function recorder(title) {
  const results = [];
  const record = (name, ok, detail = "") => {
    results.push({ name, ok });
    console.log(`${ok ? "✅" : "❌"} ${name}${detail ? `  — ${detail}` : ""}`);
  };
  const finish = () => {
    const failed = results.filter((result) => !result.ok);
    console.log(`\n──────── ${title}: ${results.length - failed.length}/${results.length} passed ────────`);
    failed.forEach((failure) => console.log(`  ❌ ${failure.name}`));
    return failed.length === 0;
  };
  return { record, finish, results };
}

/** Navigation and input helpers that tolerate hydration timing. */
export function pageHelpers(page, base = baseUrl()) {
  const goto = async (routePath, waitFor) => {
    await page.goto(`${base}${routePath}`, { waitUntil: "domcontentloaded" });
    if (waitFor) await page.waitForSelector(waitFor, { timeout: 20000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(600);
  };

  /**
   * Fill a controlled input after hydration. A fill issued before React
   * hydrates is silently wiped when the controlled value is applied, so retry
   * until the value sticks.
   */
  const setField = async (selector, value) => {
    for (let attempt = 0; attempt < 6; attempt++) {
      await page.fill(selector, value);
      await page.waitForTimeout(300);
      await page.locator(selector).evaluate((element) => element.blur());
      await page.waitForTimeout(150);
      if ((await page.inputValue(selector)) === value) return true;
    }
    return false;
  };

  const reportFormErrors = async (label) => {
    const errors = await page.locator(".field-error-text").allInnerTexts().catch(() => []);
    const status = await page.locator('[role="alert"], [role="status"]').allInnerTexts().catch(() => []);
    if (errors.length || status.length) {
      console.log(`   ↳ ${label} errors: ${JSON.stringify(errors)} status: ${JSON.stringify(status)}`);
    }
  };

  const waitForUrl = async (pattern, label) => {
    try {
      await page.waitForURL(pattern, { timeout: 20000 });
      return true;
    } catch {
      await reportFormErrors(label);
      return false;
    }
  };

  return { goto, setField, reportFormErrors, waitForUrl };
}
