# Venue filters and card v2 behind `?filters=v2`

Adds a new venue filter set (type, location with nearby toggle, date, guest buckets, price, setting, amenities, quick filters, sort, List/Images/Map) and a new venue card, as nine new files. A gate component in each router swaps them in only when the URL has `?filters=v2`; otherwise the existing `VenueBrowser` / `TgVenueBrowser` render with no wrapper markup. Mock data gains optional fields via an additive `Object.assign` block. The flagless route capture is byte-identical to baseline across 306 captures, and the file manifest shows exactly three existing files changed.

Watch for: the nearby-area adjacency map and the `respondsWithin24h` / `popular` / `recommended` values are hand-written placeholders for owner review (confirmed). The photo-count chip never renders on current data because no venue has more than one photo and `photoCount` is unset (confirmed). Bar, clean-up, event planner, wifi, backup generator and covered-outdoor return zero results because no venue is tagged with them (confirmed).

**Verdict**: APPROVED

## High-level view

The change is isolated. Three existing files are touched: one import plus one changed return in each router, and one type line plus one appended data block in `mock-data.ts`. Everything else is new files that reuse existing tokens, `.btn`, `.field`, `.card` and the existing held-booking date rule from `lib/venues.ts` without editing them. `package.json` and `pnpm-lock.yaml` are unchanged.

Filtering is a single predicate that treats every new field as unknown unless explicitly set, so venues missing the fields fail the matching filter and never throw. Counts and card-id sets for every filter and all six sorts match an independent expectation on web and in the /tg sheet.

The card shows one photo through `venueImage` with no carousel. No rating, review, award or star UI exists in the new code. The Featured badge is wired but inactive since `featured` is false everywhere.

<details>
<summary>Issues (4)</summary>

1. **Nearby-area map is approximate (confirmed)** — hand-written in `lib/venue-filters-v2.ts` (marked APPROXIMATE); owner should confirm which Addis areas count as nearby.
2. **Placeholder demo flags (confirmed)** — `respondsWithin24h`, `popular`, `recommended` in `lib/mock-data.ts` are invented values; replace with real data. They also drive the default "recommended" sort order.
3. **Photo-count chip not visible on current data (confirmed)** — every venue has one photo and `photoCount` is unset; set `photoCount` or add photos to see it.
4. **Zero-result filters on current data (confirmed)** — bar, clean-up, event planner, wifi, backup generator and covered-outdoor match no venue because none is tagged. Tag venues from real facts when available. Map view is a grouped-by-area list, not an interactive map.

</details>

<details>
<summary>Details</summary>

## Flag gate and flagless parity

`VenueBrowserGates.tsx` returns `<VenueBrowserV2 />` or the untouched `<VenueBrowser />` / `<TgVenueBrowser />` depending on `useFiltersV2Flag()`. The edits are as specified. `PageRouter.tsx` adds its import at line 11 with line 10 untouched and returns `<VenueBrowserGate />` for `/venues` (line 47). `TgPageRouter.tsx` adds its import at line 14 with line 13 untouched and returns `<TgVenueBrowserGate key={queryKey} />` (line 43), keeping the existing remount-on-query behavior.

In `mock-data.ts`, the diff against the baseline is two hunks, both pure additions: the optional-fields line in the `Venue` type (line 14, immediately after the original line 13) and the block after the original line 220 `);` (lines 222-240). No existing field or venue was reordered or removed.

## Missing-field safety

`matchesFiltersV2` guards every new field: `venue.setting &&`, `venue.amenityTags?.includes`, strict `=== true` for the three flags, `guestBucketsOf` for buckets, `?? ""` for text. `photoCountOf` falls back from `photoCount` to `photos?.length` to 0. The card derives setting and amenity tags by filtering against the known lists with optional chaining, and shows the responds badge only on `=== true`. A venue with none of the new fields renders and filters without throwing.

## Accessibility and keys

Focus visibility comes from the global `:focus-visible` rule in `app/globals.css`; the new CSS adds no outline overrides. In /tg, options, chips, fields and the view switch are 44px minimum via `.v2-touch`; the sheet buttons use the existing `.btn`. The dev-mode run reported zero React key warnings.

## Verification coverage

Typecheck passed. `next build` succeeded in a `/tmp` copy; the first attempt failed only because pnpm refused a symlinked `node_modules`, and the same script run directly succeeded. 129 flagged checks passed on both production and dev servers. The evidence step could not cover visual design, real Telegram WebView behavior, Amharic strings (v2 copy falls back to English) or screen-reader conformance, which needs manual assistive-technology testing.

Not tested: the flagged flow with a venue whose new fields are all absent (the guards were read, not exercised).

</details>

<details>
<summary>File map</summary>

- `components/PageRouter.tsx` — one import, `/venues` returns `VenueBrowserGate`
- `components/tg/TgPageRouter.tsx` — one import, `/venues` returns `TgVenueBrowserGate`
- `lib/mock-data.ts` — optional Venue fields line plus additive `venueV2Fields` block
- `lib/venue-filters-v2.ts` — predicate, sort, hook, flag hook, nearby map
- `lib/venue-filters-v2-copy.ts` — v2 labels (English fallback)
- `components/venues-v2/VenueFiltersV2.tsx` — filter controls
- `components/venues-v2/VenueCardV2.tsx` — new card
- `components/venues-v2/VenueResultsV2.tsx` — toolbar, list/images/map rendering
- `components/venues-v2/VenueBrowserV2.tsx` — web sidebar layout
- `components/venues-v2/TgVenueBrowserV2.tsx` — /tg bottom sheet layout
- `components/venues-v2/VenueBrowserGates.tsx` — flag gates
- `components/venues-v2/venues-v2.css` — scoped styles using existing tokens

Full evidence: `/tmp/addis-v2-review/verify-evidence.md`.

</details>
