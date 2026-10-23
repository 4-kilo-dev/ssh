# Dashboard reshape — verification evidence

Iteration: FIRST (no prior review.json present). Scope: visual reshape of Admin
dashboard + Vendor dashboard, plus two owner-approved app-wide refinements.

## Files changed (only these)
0. `lib/i18n.ts` (OWNER-APPROVED, option a — casing only, EN only)
   - `homeKicker`: "VENUES FOR YOUR NEXT ADDIS CELEBRATION" -> "Venues for your
     next Addis celebration"
   - `adminWorkspace`: "ADMIN WORKSPACE" -> "Admin workspace"
   - Amharic values (lines 1141, 1469) left unchanged; nothing else in i18n.ts
     touched. Meaning unchanged, casing only — completes the app-wide de-cap
     intent so these two eyebrows match every other sentence-case eyebrow.
1. `app/globals.css`
   - De-capped the shared `.eyebrow` label: removed `text-transform:uppercase`
     and the wide `letter-spacing`; now `letter-spacing:normal; text-transform:none;`
     weight relaxed 800 -> 700. Color role and effective size (11px via type
     scale) unchanged. Applies app-wide (landing, cards, admin, vendor, tg).
   - Added a focused dashboard block: `--focal-gold:#9a6410` and
     `.dashboard-hero` / `.dashboard-hero-figure` / `.dashboard-hero-number` /
     `.dashboard-hero-label` (one oversized tabular-figures focal number, quiet
     label). Added `font-variant-numeric:tabular-nums` to `.stat-card > strong`
     and `.status-count-card > strong`. Replaced the templated soft-grey hover
     drop shadow on `.quick-link:hover` (`box-shadow:0 6px 18px ...`) with a
     quiet border + surface-tint lift (`box-shadow:none`).
2. `components/AdminTools.tsx`
   - AdminDashboard return JSX only: added a presentational `<section class="dashboard-hero">`
     that RE-PRESENTS the already-computed `upcoming` value (upcoming events) as
     the hero number. No data/handler/computation changed.
3. `components/VendorFlow.tsx`
   - VendorHome return JSX only: added the same presentational hero re-presenting
     the already-computed `newCount` (new inquiries). No logic changed.

No other files touched. No edits to lib/*, mock-data, store, routers, i18n,
other components/screens, AdminFrame, nav, filters, or handlers.

## Gold accent contrast (WCAG)
Focal number color `#9a6410` (a deeper, AA-safe tuning of the requested ~#C8891B,
which measured only ~2.98:1 and failed even large-text):
- on `#ffffff` surface: 4.99:1  (passes AA for any text size)
- on `#f7f7f3` paper:   4.65:1  (passes AA for any text size)
The hero number is also very large (clamp 52–76px, weight 800), well above the
large-text threshold.

## Typecheck
`pnpm typecheck` (tsc --noEmit) in the repo: PASS (exit 0), both before and after
the self-critique simplification.

## Visual verification method
- No dev server was running on port 3000 (user server untouched; never started it).
- Built a COPY of the app under `/tmp/addis-reshape-build` (source copied,
  node_modules symlinked, separate .next) and served it with `next start` on
  127.0.0.1:3103. Did NOT run `next build` inside the repo (shared .next avoided).
- Headless screenshots via playwright-core from `~/.cache/addis-e2e` driving the
  cached Chromium (`~/Library/Caches/ms-playwright/chromium-1105`). Demo role
  seeded via localStorage key `addis-gathering-demo-v1` (role/staffRole) in an
  init script.
- Captured desktop (1280) + mobile (390) for /admin and /vendor, plus /,
  /venues, /tg spot-checks. Screenshots saved alongside this note
  (after-*.png). Reviewed them directly.
- Server stopped after capture; ports 3000 and 3103 confirmed free.

## What the screenshots confirm
- Admin + Vendor: single gold focal number reads as the hero; stat row, status
  counts, activity/notification columns, and vendor quick-links all retained and
  restyled quiet (hairline borders, tabular numbers, no uniform drop shadow).
- De-capped `.eyebrow` reads as intentional sentence case everywhere that the
  underlying i18n string is sentence case: landing ("Popular areas", "Spaces to
  celebrate in", "Next step"), admin columns ("Recent activity", "Notifications"),
  vendor rows, card eyebrows, tg.
- Mobile (390px) stacks cleanly; no overflow; visible focus ring (teal) preserved;
  reduced-motion media query unchanged; no new non-user motion added.

## Finding resolution (escalated, then owner-approved)
Two English i18n VALUES were authored in literal ALL-CAPS and still shouted after
the CSS de-cap: `homeKicker` and `adminWorkspace`. Raised via send_message
(warning); owner approved option (a): normalize just those two EN strings to
sentence case (casing only, not meaning), leave Amharic as-is, change nothing
else. Applied and re-verified — both now render sentence case ("Admin workspace",
"Venues for your next Addis celebration"), matching every other eyebrow.

## Confirmations
- No logic, routes, component behavior, filters, handlers, state, store, or
  mock-data changed. Changes are CSS + presentational wrapper JSX + the two
  owner-approved EN i18n casing edits only.
- No git commands were run (no diff/status/log/commit/push/restore/checkout).
- No repo plan/report/doc files created; no tests added. This note + screenshots
  live under .agents/tasks/dashboard-reshape as requested; the build copy and
  scripts are scratch under /tmp.

## Iteration 2 — review findings resolved (review.json: CHANGES_REQUESTED)
Two findings were raised by the reviewer; both are now resolved.

1. `eyebrow-size-drift` (minor) — FIXED. `.eyebrow` in app/globals.css line 43
   had `font-size:12px`, drifting from the "keep its size" instruction. Reverted
   to `font-size:11px`. (Effective rendered size was already 11px — line 650
   `.eyebrow, .caption-kicker, th, .sample-stamp { font-size:11px }` comes later
   with equal specificity and won the cascade — so this is source-level only and
   produces no visible change; it just removes the misleading 12px declaration.)

2. `off-limits-i18n-edit` (blocking) — RECONCILED by owner decision (PATH 1).
   The two EN i18n casing edits (`homeKicker` -> "Venues for your next Addis
   celebration", `adminWorkspace` -> "Admin workspace"; Amharic untouched) were
   escalated via send_message. The loop owner extended the file-scope gate to
   explicitly sanction exactly these two EN string casing edits in lib/i18n.ts,
   in addition to app/globals.css, AdminDashboard JSX, and VendorHome JSX. Do NOT
   revert. There is no CSS-only alternative (text-transform:none cannot lowercase
   literal-caps source strings). No further i18n change made; values confirmed
   still sentence case (lib/i18n.ts lines 256, 657) with Amharic intact (lines
   1141, 1469).

`pnpm typecheck` (tsc --noEmit) after the 11px revert: PASS (exit 0). No git ran;
no logic/data/route/behavior changed.
