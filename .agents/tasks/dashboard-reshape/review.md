# Dashboard reshape — design + owner-rule review (iteration 3)

The change reshapes the Admin and Vendor dashboards into control-panel headers with a single oversized gold focal number, quiets the stat/status/quick-link tiles to hairline borders with tabular figures, and de-caps the shared `.eyebrow` label app-wide. The two dashboard JSX edits only re-present already-computed values (`upcoming`, `newCount`) inside a presentational `<section class="dashboard-hero">`; no data, handler, computation, filter, store, route, or mock-data was touched. This pass checks the two findings the prior iteration raised — both are now resolved.

**Watch for:** nothing blocking remains — **confirmed**. The prior `eyebrow-size-drift` is fixed (11px restored) and the prior `off-limits-i18n-edit` is reconciled by an explicit owner decision that extended the file-scope gate to the two EN casing edits.

**Verdict**: APPROVED

## High-level view

The design work was on target in the prior pass and is unchanged except for the 11px revert. There is exactly one focal element per dashboard: an oversized tabular-figures number in warm Ethiopian gold over a quiet muted label. Everything else earns hierarchy from type and spacing — stat tiles and status counts carry a hairline `--line` border instead of a templated soft-grey shadow, and the quick-link hover shadow was replaced with a quiet border + surface tint. No AI tells were introduced: no middle-dot meta strings, no em-dash fragment labels, no monospace data labels, no acid-on-black accent, no uniform rounded-card kit.

The gold is `#9A6410`, not the literal `~#C8891B` requested, because `#C8891B` measures 2.98:1 on white and fails WCAG AA; `#9A6410` is 4.99:1 on white and 4.65:1 on paper, AA-clean at any size while staying in the warm-gold family. The `~` plus the hard "at AA contrast" requirement make this a compliant tuning, not a deviation.

Both prior findings are closed. The `.eyebrow` size is back to 11px, honoring the "keep its size" constraint; the diff and the later cascade rule both land at 11px. The two literal-caps English eyebrow values (`homeKicker`, `adminWorkspace`) were de-capped at the source in `lib/i18n.ts` — the only mechanism available, since `text-transform:none` cannot lowercase literal-caps content. That edit falls outside the three files the gate originally named, but the loop owner explicitly extended the gate (via the escalation documented in the evidence note) to sanction exactly these two EN casing edits, Amharic untouched. With that sanction in place, the file-scope gate passes and there are no blocking concerns on either axis.

<details>
<summary>Issues (0)</summary>

No open issues. Prior findings `eyebrow-size-drift` (minor) and `off-limits-i18n-edit` (blocking) are both resolved — the first by reverting to 11px, the second by an explicit owner gate extension sanctioning the two EN i18n casing edits.

</details>

<details>
<summary>Details</summary>

## Prior finding 1 — eyebrow size drift (RESOLVED)

The iteration-2 review flagged `.eyebrow` drifting from 11px to 12px against the "keep its color role and size" instruction. The current `app/globals.css` line 43 reads `font-size:11px` again (confirmed in the diff: the `.eyebrow` rule now carries `font-size:11px; font-weight:700; letter-spacing:normal; text-transform:none;`). The later rule at the bottom of the file also pins `.eyebrow` to 11px, so source and rendered size agree. Color role `#57726a` unchanged. Finding closed.

## Prior finding 2 — off-limits i18n edit (RECONCILED by owner)

The gate originally permitted edits only to `app/globals.css`, AdminDashboard JSX in `AdminTools.tsx`, and VendorHome JSX in `VendorFlow.tsx`. The coder edited two EN translation values in `lib/i18n.ts`: `homeKicker` (`VENUES FOR YOUR NEXT ADDIS CELEBRATION` → `Venues for your next Addis celebration`) and `adminWorkspace` (`ADMIN WORKSPACE` → `Admin workspace`). The diff confirms those are the only two i18n lines changed; a scan confirms the Amharic values for both keys (lines 1141, 1469) are intact, and the only remaining all-caps EN values are the acronyms `FAQ` and `ETB`, correctly left alone.

Both strings are consumed exclusively through `.eyebrow` (`homeKicker` in CoreFlow, VendorFlow, LandingPage, VendorExtras, CustomerExtras, venues-v2, tg; `adminWorkspace` in AdminTools). A CSS-only `text-transform:none` cannot lowercase literal-caps content, so without the source edit these two eyebrows would have kept shouting while every other eyebrow went sentence-case — a visible mixed-casing regression on landing, vendor, and admin headers. The coder escalated this via send_message and the loop owner approved PATH 1: extend the file-scope gate to explicitly sanction exactly these two EN casing edits (casing only, not meaning; Amharic untouched; nothing else in i18n.ts changed). With the gate extended by the owner, this is no longer a violation. Finding closed.

## One focal number per dashboard (unchanged, confirmed)

Both dashboards open with `.dashboard-hero`: a single `clamp(52px,8vw,76px)`, weight-800, gold, tabular-figures number over a quiet muted label. Admin re-presents `upcoming`; Vendor re-presents `newCount`. Both values were already computed above the return; the hero reads them, adds no import, changes no computation.

## Gold accent and AA contrast (unchanged, confirmed)

`:root { --focal-gold:#9a6410 }` drives the hero number: 4.99:1 on `--surface` (#fff) and 4.65:1 on `--paper` (#f7f7f3), AA for any text size. The requested `#C8891B` would have failed AA. The deviation is required by the brief's own AA constraint and keeps the warm Ethiopian-gold character.

## Quiet hierarchy, no templated shadow (unchanged, confirmed)

Stat and status-count tiles keep the existing `--line` hairline border and gain `font-variant-numeric:tabular-nums`. The quick-link hover rule dropped its `box-shadow:0 6px 18px ...` soft-grey lift for `border-color` + `--teal-soft` surface tint with `box-shadow:none`. Hierarchy comes from type and spacing.

## Owner-rule gate

- Logic/data/route/behavior: unchanged — both JSX edits re-present existing values; no handler, state, store, filter, or mock-data touched.
- Removed stats/links/sections: none — the full stat grid, status counts, activity/notification columns, and all seven vendor quick-links are retained.
- File scope: PASS — `app/globals.css`, AdminDashboard JSX, VendorHome JSX, plus the two EN i18n casing edits the owner explicitly sanctioned. No other file touched.
- Git usage: none claimed; nothing in the diff indicates otherwise.
- New plan/report/doc or test files in the repo: none. Evidence note and screenshots live under `.agents/tasks/`; scratch build/scripts under `/tmp`.
- Non-dashboard regression from the eyebrow change: none — no remaining all-caps EN eyebrow value exists, so no screen is left half-de-capped.

## Accessibility (unchanged, confirmed)

Focus ring (`:focus-visible` 3px teal) untouched; reduced-motion media query untouched; no new non-user motion added; mobile rule shrinks hero padding at 560px. The hero conveys meaning through the large number + text label, not color alone.

## Verification evidence

`pnpm typecheck` passed (exit 0) per the note, re-run after the 11px revert. Desktop + mobile screenshots for /admin, /vendor, /, /venues, /tg are present and dated. No suite was re-run for this review.

</details>

<details>
<summary>File map</summary>

- `app/globals.css` — `.eyebrow` de-cap (transform/tracking/weight), size back to 11px; `--focal-gold` + `.dashboard-hero*` block; tabular-nums on stat/status strongs; quiet quick-link hover.
- `components/AdminTools.tsx` — AdminDashboard JSX: added `.dashboard-hero` re-presenting `upcoming`.
- `components/VendorFlow.tsx` — VendorHome JSX: added `.dashboard-hero` re-presenting `newCount`.
- `lib/i18n.ts` — owner-sanctioned: `homeKicker` and `adminWorkspace` de-capped to sentence case (EN only; Amharic intact).

Full diff: `git diff` in the repo root.

</details>
