# Addis Ababa Venue Marketplace — Implementation Plan

## Product and architecture

Build a responsive, front-end-only event venue marketplace using Next.js App Router, TypeScript, and Tailwind CSS. There is no backend, database, real API integration, or payment processing. Use a single `lib/mock-data.ts` file for initial mock records and one shared local-state store (persisted to localStorage) for cross-area state changes. Clearly communicate that role switching, access boundaries, payment, fees, refunds, receipts, and reports are demo simulations; never collect financial credentials.

The work is completed in this order, with each phase implemented and verified before the next begins:
1. Core path: venue list and functioning filters, detail, booking request, simulated deposit, admin approval, customer status, and calendar update.
2. Vendor inquiries: submit, vendor response/status transitions, lead-fee statement and admin revenue reflection.
3. Remaining admin screens, reports, role-specific navigation, and settings.
4. Remaining customer and vendor screens.

Use reusable UI primitives and state patterns. `FormState` standardizes field validation, pending/loading, success and recoverable error feedback while preserving form values. `ListState` standardizes loading, empty and no-results views. Route areas remain distinct: customer/public, `/vendor`, `/admin`; `/demo` exposes the demo menu. Route restrictions are preview behavior only, never represented as security guarantees.

## Booking and demo rules

Several customers may request the same venue/date. A successful simulated deposit alone transitions Requested → Reserved and blocks the date. Pending and failed outcomes keep the booking Requested and date unblocked; failed payments allow retry. Admin approval transitions Reserved → Confirmed and updates calendar/customer state. If a booking is Reserved or Confirmed, other Requested bookings on that venue/date remain open and are flagged exactly `Needs reschedule or reject`; only an explicit admin reject or reschedule resolves them. Rejecting/canceling the reservation releases the date and removes the overlap flag from other requests. No automatic rescheduling or rejection.

Payment outcome is selected through `/demo`, with the exact label `Simulation: payment outcome (success / failure / pending)`. Every payment, receipt, refund, fee-statement, and revenue screen persistently shows `Demo: no real payment is processed`; sample receipts/statements are labeled `Sample`. Refund actions mutate mock state only.

## Localization, accessibility, responsiveness

Put every user-visible string—including form validation, loading/empty/error/success copy, statuses, notices, controls, and accessible names—in English and Amharic dictionaries. Both locales are left-to-right. A shared formatter handles dates, numbers, and ETB consistently. Test long Amharic labels at narrow widths. Use semantic HTML, associated labels, screen-reader names, keyboard-operable controls, clear visible focus, and status icon + text + consistent color (never color alone). Forms retain inputs after errors and tell the user what to do next. Lists in every area provide loading, empty, and no-results states. On narrow screens stack filters, make data tables cards/lists with reachable key actions, and render the calendar as an agenda/list.

## Design direction

- **Design Movement:** restrained civic/service design, borrowing from clear wayfinding and editorial information design rather than polished marketplace gloss.
- **Core Principles:** clarity before decoration; predictable reusable controls; visible state and recovery; responsive content-first layouts.
- **Color Philosophy:** mostly warm paper/stone neutrals with a restrained deep-teal accent; semantic status colors are consistent and always paired with labels/icons. Ensure readable contrast in every state.
- **Layout Paradigm:** editorial split regions and practical side navigation on wide admin/vendor screens; narrow screens collapse navigation and stack controls. Venue exploration prioritizes a search/filter rail and adaptable result cards, not a single centered hero.
- **Signature Elements:** compact location/date wayfinding row; restrained outlined cards with clear section dividers; consistent icon-and-label status markers.
- **Interaction Philosophy:** explicit feedback after actions, reversible demo state, no silent changes, and progressive disclosure for secondary listing details.
- **Animation:** restrained 120–180ms opacity/position transitions for menus and feedback; no motion required for meaning; honor `prefers-reduced-motion` and avoid repetitive or attention-grabbing movement.
- **Typography System:** system sans-serif stack with robust Ethiopic fallbacks (Noto Sans Ethiopic where installed, then system sans); clear hierarchy with medium-weight headings and readable body sizes; avoid condensed/light text.
- **Brand Essence:** a practical local guide connecting Addis event planners with venues and services; **clear, local, dependable**.
- **Brand Voice:** direct and reassuring; examples: “Find a space for your next gathering.” / “Your request is saved. You can follow its status here.”
- **Wordmark & Logo:** text-led wordmark with a simple two-arch doorway mark, a subtle venue/wayfinding reference; footer mark activation supports the accessible five-activation demo-menu entry.
- **Signature Brand Color:** deep Addis teal, used sparingly for primary actions and focus accents.

## Project structure

- `app/[[...slug]]/page.tsx`, `app/layout.tsx`, and `app/globals.css`: App Router entry, catch-all page, shared shell metadata and responsive styling.
- `components/PageRouter.tsx`: maps URL paths to customer, vendor, admin, and `/demo` preview screens; `AppShell.tsx` provides shared navigation/footer.
- `components/CoreFlow.tsx`, `CustomerExtras.tsx`, and `LandingPage.tsx`: public discovery, booking/payment flows, and customer self-service.
- `components/VendorFlow.tsx` and `VendorExtras.tsx`: vendor inquiry workflow, application, listing, and settings.
- `components/AdminTools.tsx`: role-aware admin operations, reports, calendar, fees, and management screens.
- `components/StatePatterns.tsx` and `StatusBadge.tsx`: reusable form/list feedback and accessible status labels/icons/colors.
- `lib/mock-data.ts`: initial mock entities only.
- `lib/store.tsx`: shared demo reducer/context and localStorage synchronization.
- `lib/i18n.ts` and `lib/format.ts`: English/Amharic UI dictionaries and shared locale-aware date, month, number, and ETB formatters.
- `public/images/`: local placeholder imagery, mapped through `lib/images.ts`.
- `public/brand-mark.svg`: site brand mark.
- `Dockerfile`: production Node 22 / pinned pnpm build and Next.js start process.
- `README.md`: route inventory, demo-menu access, simulated financial behavior, and the explicit backend/security limitation.

## Dependencies, serving and delivery

Use the existing Next.js App Router with TypeScript and Tailwind, Node 22, pnpm pinned in `package.json`, and the checked-in pnpm 11 lifecycle-script policy in `pnpm-workspace.yaml`. The app runs on port 3000. Production uses the declared container only to serve the Next.js front end (`PORT` is honored); the managed database is disabled, and no application API, business backend, real authentication, or payment processor is used. All mutable demo records stay in browser localStorage with a deterministic reset to the original mock dataset. Run code diagnostics and clean production build checks, inspect the core flows and subsequent stages, save a canonical-main checkpoint, and explicitly publish the public demo requested by the user. No production secrets or protected credentials are required.
