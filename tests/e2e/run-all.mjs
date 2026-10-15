/**
 * Runs every browser suite in sequence against one origin.
 *
 *   node tests/e2e/run-all.mjs
 *   BASE=http://127.0.0.1:3100 node tests/e2e/run-all.mjs
 *
 * Suites: mini-app (390px end-to-end), telegram (SDK integration), preview
 * (desktop iframe frame). Exits non-zero if any suite fails.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { baseUrl } from "./harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const suites = ["web-routes.mjs", "images.mjs", "mini-app.mjs", "telegram.mjs", "preview.mjs"];
const base = baseUrl();

console.log(`Running ${suites.length} suites against ${base}\n`);

const outcomes = [];
for (const suite of suites) {
  console.log(`\n════════ ${suite} ════════`);
  const result = spawnSync(process.execPath, [path.join(here, suite)], {
    stdio: "inherit",
    env: { ...process.env, BASE: base },
  });
  outcomes.push({ suite, code: result.status ?? 1 });
}

console.log("\n════════ summary ════════");
for (const { suite, code } of outcomes) console.log(`${code === 0 ? "✅" : "❌"} ${suite}`);
const failed = outcomes.filter((outcome) => outcome.code !== 0);
console.log(failed.length ? `\n${failed.length} suite(s) failed` : "\nAll suites passed");
process.exit(failed.length ? 1 : 0);
