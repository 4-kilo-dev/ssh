# Browser tests

End-to-end suites that drive a real Chromium against a running server. They cover
the Telegram Mini App at a 390px phone viewport, the Telegram SDK integration, and
the desktop preview frame.

These tests are **not wired into `package.json`**. They need `playwright-core`, and
adding it would change both `package.json` and `pnpm-lock.yaml`. Instead the harness
resolves it from outside the project.

## One-time setup

Install `playwright-core` outside the repo:

```bash
mkdir -p ~/.cache/addis-e2e
npm --prefix ~/.cache/addis-e2e install playwright-core
```

A Chromium build is also required. Playwright's cached browsers are auto-detected
from `~/Library/Caches/ms-playwright` (macOS), `~/.cache/ms-playwright` (Linux) or
`%LOCALAPPDATA%/ms-playwright` (Windows). If yours live elsewhere, set `CHROME_PATH`,
or install one with `npx --yes playwright install chromium`.

Already have `playwright-core` somewhere? Point at it instead:

```bash
PLAYWRIGHT_CORE_PATH=/path/to/playwright-core node tests/e2e/run-all.mjs
```

## Running

Start the app first (see the main README), then:

```bash
node tests/e2e/run-all.mjs                      # all suites, http://127.0.0.1:3000
BASE=http://127.0.0.1:3100 node tests/e2e/run-all.mjs   # a different origin
node tests/e2e/mini-app.mjs                     # one suite
```

| Suite | Covers |
| --- | --- |
| `web-routes.mjs` | All 73 web routes: HTTP 200, and links + visible text unchanged against `baselines/web-routes.json`. Also checks server-rendered images resolve |
| `images.mjs` | Imagery on hydrated pages: expected image counts, and every distinct source decoded through `new Image()` so nothing renders broken |
| `mini-app.mjs` | Shell and bottom nav, filters bottom sheet, calendar, booking + payment (success / pending / failure), the `/admin` round-trip, contact-hiding rules, route isolation, Amharic at 390px |
| `telegram.mjs` | `ready()`, `expand()`, BackButton, MainButton (including a tap that submits a booking), Telegram sign-in, and the plain-browser fallbacks |
| `preview.mjs` | `/tg-preview` iframe sizing and that desktop layouts collapse inside the frame |

The 73 web routes are hardcoded in `web-routes.mjs`, so this suite is self-contained —
it depends on no manifest or generated file.

To re-record the route baseline after an intentional markup change:

```bash
node tests/e2e/web-routes.mjs --update
```

Then review the `baselines/web-routes.json` diff before committing.

## Notes

- `mini-app.mjs` **clears `localStorage`** on the target origin to start from the
  seeded demo state. Don't run it against an origin whose demo state you care about.
- `BASE` selects the origin; `CHROME_PATH` and `PLAYWRIGHT_CORE_PATH` /
  `PLAYWRIGHT_CORE_DIR` control resolution of the browser and the runner.
- The suites share `harness.mjs`, which owns the `record`/`finish` reporting,
  hydration-safe form filling, and the Chromium lookup.
