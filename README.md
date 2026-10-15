# Addis Ababa Venue Marketplace

A responsive Next.js + TypeScript front-end demo for discovering event venues, requesting bookings, and coordinating vendors in Addis Ababa. The UI supports English and Amharic (both left-to-right), formats dates/numbers/ETB through shared helpers, and stores demo records in browser-local state.

## Run and inspect

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```

The app is front-end only: it has no application data API, business backend, or database. It does not send sign-in codes, contact providers, process payments, or save records to a server. Use the persistent demo notice and sample labels as the source of truth; never enter real payment credentials.

`pnpm start` runs the production Next.js UI and honors the host-provided `PORT`. The published Node container is used only to serve the front end; database provisioning remains disabled, and all mutable demo state stays in this browser's localStorage.

## Demo controls

- Open `/demo`, or activate the footer logo **five times** by click, tap, or Enter. The counter is keyboard accessible.
- The panel is labeled **“Demo: preview as role”** and lets you preview Customer, Vendor, or Admin/staff-role screens, select the payment simulation outcome, change contact-visibility and lead-fee timing, and reset mock data.
- The payment selector is **“Simulation: payment outcome (success / failure / pending)”**. Success makes a booking Reserved and blocks its date; pending and failure leave it Requested and the date unblocked. Failure can be retried. Admin approval confirms a reserved booking. Conflicting requests remain open and are flagged until an admin explicitly rejects or reschedules them.
- Vendor preview sign-in uses the sample phone shown on the form and the on-screen demo OTP. No SMS is sent.

> **Demo boundary:** Role switching and access controls are for preview only. Real authorization and data isolation require a backend. All payment, refund, receipt, fee-statement, and revenue values are mock state; **no real payment is processed**.

## Route guide

Dynamic segments use `:id` or `:report` in this guide.

### Customer and public

- `/` — marketplace landing page
- `/demo` — demo-only role, payment-outcome, contact-visibility, fee-timing and reset controls (not in normal navigation)
- `/venues`, `/venues/:id` — venue discovery and detail
- `/vendors`, `/vendors/:id` — vendor discovery and profile
- `/bookings/new`, `/bookings/submitted`, `/bookings/:id` — request, confirmation, detail
- `/payments/deposit`, `/payments/success`, `/payments/failed`, `/payments/receipt` — simulated deposit and sample receipt states
- `/inquiries/new`, `/inquiries/sent`, `/my-inquiries`, `/my-inquiries/:id` — vendor inquiries
- `/my-event`, `/my-bookings`, `/my-bookings/:id`, `/my-payments`, `/saved` — customer workspace
- `/sign-in`, `/verify-otp`, `/profile/setup`, `/profile`, `/settings`, `/notifications` — mock account and preferences
- `/about`, `/faq`, `/terms`, `/privacy`, `/contact` — informational and contact pages

### Vendor

- `/vendor/sign-in`, `/vendor/apply`, `/vendor/application` — mock sign-in, application and review status
- `/vendor` — vendor dashboard
- `/vendor/profile`, `/vendor/listing-preview`, `/vendor/settings`, `/vendor/notifications` — listing and account tools
- `/vendor/inquiries`, `/vendor/inquiries/:id` — inquiry inbox and response
- `/vendor/fee-statements`, `/vendor/fee-statements/:id` — sample fee records

### Admin

- `/admin/login`, `/admin` — demo access preview and dashboard
- `/admin/bookings`, `/admin/bookings/new`, `/admin/bookings/:id`, `/admin/bookings/:id/edit`, `/admin/calendar`
- `/admin/venues`, `/admin/venues/new`, `/admin/venues/:id`, `/admin/venues/:id/packages`
- `/admin/vendors`, `/admin/vendors/:id`, `/admin/categories`, `/admin/customers`, `/admin/customers/:id`
- `/admin/inquiries`, `/admin/inquiries/:id`, `/admin/payments`, `/admin/payments/:id`, `/admin/revenue`
- `/admin/reports`, `/admin/reports/:report`, `/admin/users`, `/admin/notifications`, `/admin/settings`, `/admin/audit`, `/admin/content`

## Telegram Mini App (`/tg`)

The same project also serves a Telegram Mini App version of the customer app at `/tg`. It reuses the web app's components, mock data, shared state and English/Amharic dictionaries — it is not a fork or a rebuild.

- **Customer screens only.** Vendor and admin routes are unreachable from `/tg`; any unrecognised path shows a not-found card.
- `/tg` ignores the demo role switcher, so it never shows "Access denied" because `/demo` was left on another role. Vendor and admin areas stay reachable in the web app exactly as before.
- Bookings, inquiries, payments and saved vendors use the **same browser-local store** as the web app. A booking created in `/tg` appears in the admin panel at `/admin` on the same origin — reload the admin tab if it was already open.
- The payment-outcome selector is at **`/tg/demo`** (the sliders icon in the Mini App top bar), with the same label as the web app: `Simulation: payment outcome (success / failure / pending)`.
- Mobile rules: bottom navigation (Home, Venues, My Event, Profile), filters in a bottom sheet, cards instead of tables, a compact month calendar with an agenda list, tap targets of at least 44px, and a sticky primary action on the booking and payment screens.

### Run it

```bash
pnpm dev

# Mini App
open http://localhost:3000/tg

# Laptop preview: the Mini App in a 390px phone frame
open http://localhost:3000/tg-preview
```

Review the Mini App at a **390px-wide viewport**. `/tg-preview` renders it inside a phone-width iframe so it can be demonstrated on a laptop without resizing the browser window; the frame shares the same demo state, so anything booked there shows up in the admin panel.

`/tg` also accepts a `?lang=am` or `?lang=en` deep link, which is handy for showing the Amharic UI.

Mini App routes: `/tg`, `/tg/sign-in`, `/tg/verify-otp`, `/tg/profile/setup`, `/tg/venues`, `/tg/venues/:id`, `/tg/vendors`, `/tg/vendors/:id`, `/tg/inquiries/new`, `/tg/inquiries/sent`, `/tg/bookings/new`, `/tg/bookings/submitted`, `/tg/bookings/:id`, `/tg/payments/deposit`, `/tg/payments/success`, `/tg/payments/failed`, `/tg/payments/receipt`, `/tg/my-event`, `/tg/my-bookings`, `/tg/my-bookings/:id`, `/tg/my-inquiries`, `/tg/my-inquiries/:id`, `/tg/my-payments`, `/tg/saved`, `/tg/notifications`, `/tg/profile`, `/tg/settings`, `/tg/demo`.

### Test inside real Telegram (HTTPS tunnel)

Telegram only opens Mini Apps over **HTTPS**, so expose your local server through a tunnel. Leave `pnpm dev` running in another terminal.

```bash
# cloudflared
cloudflared tunnel --url http://localhost:3000
# prints something like https://random-words-1234.trycloudflare.com

# or ngrok
ngrok http 3000
# prints something like https://abcd-1234.ngrok-free.app
```

Then open the tunnel URL with the `/tg` path, for example `https://<your-tunnel-host>/tg`.

### Set it as the bot menu button

1. Open [@BotFather](https://t.me/BotFather) and send `/mybots`, then pick your bot.
2. Go to **Bot Settings → Menu Button → Configure menu button**.
3. Enter the Mini App URL **including the path**, e.g. `https://<your-tunnel-host>/tg`, and a button title.
4. Or use `/newapp` to register the Mini App, or `/setmenubutton` to set the button directly.
5. Open the bot in Telegram and tap the menu button.

Free tunnel URLs change on every restart, so update the URL in BotFather when you start a new tunnel.

### What is shared with the web app

| Shared | Where |
| --- | --- |
| Design tokens | `app/tokens.css`, imported by `app/globals.css` |
| Shared state | `lib/store.tsx` — one `DemoProvider`, one localStorage key |
| Mock data | `lib/mock-data.ts` |
| English/Amharic dictionaries | `lib/i18n.ts` |
| Date/number/ETB formatters | `lib/format.ts` |
| Status colour, label and icon | `components/StatusBadge.tsx` |
| Form and list state patterns | `components/StatePatterns.tsx` |
| Customer screens | `components/CoreFlow.tsx`, `components/CustomerExtras.tsx`, and the customer half of `components/VendorFlow.tsx` |
| Venue filter predicate and labels | `lib/venues.ts` |

Only the mobile-specific pieces are new: `app/tg/` and `components/tg/` hold the shell, bottom navigation, bottom sheet, compact calendar, sticky primary action and Telegram sign-in; `lib/telegram.ts` wraps `telegram-web-app.js`; `app/tg-preview/` is the laptop preview frame.

Navigation between the two trees is handled by `lib/nav.tsx`. Its `Link` and `useRouter` default to the web app's paths, so the web app is unaffected; `/tg` mounts `NavBaseProvider base="/tg"`, which re-points the same shared components at the Mini App routes instead of duplicating them.

## Browser tests

`tests/e2e/` holds end-to-end suites that drive a real Chromium against a running
server: a regression check over all 73 web routes, an imagery check, the Mini App at
a 390px phone viewport, the Telegram SDK integration, and the desktop preview frame.

They are **not** wired into `package.json`, because they need `playwright-core` and
adding it would change `package.json` and `pnpm-lock.yaml`. Install it outside the
project instead:

```bash
mkdir -p ~/.cache/addis-e2e
npm --prefix ~/.cache/addis-e2e install playwright-core
```

Then start the app (above) and run:

```bash
node tests/e2e/run-all.mjs                              # all suites, localhost:3000
BASE=http://127.0.0.1:3100 node tests/e2e/run-all.mjs   # against another origin
node tests/e2e/mini-app.mjs                             # a single suite
```

`~/.cache/addis-e2e` is auto-detected. If your copy of `playwright-core` lives
elsewhere, set `PLAYWRIGHT_CORE_PATH`. Cached Chromium builds are auto-detected; use
`CHROME_PATH` to override. Note that the Mini App suite **clears `localStorage`** on
the target origin so it starts from the seeded demo state. See
`tests/e2e/README.md` for the full details.

## Project structure

- `app/` — Next.js App Router shell and global styles
- `components/` — customer core flow, vendor flow, Admin workspace, shared application shell and form/list/status patterns
- `lib/mock-data.ts` — seed records and model types
- `lib/store.tsx` — browser-local shared state and simulated state transitions
- `lib/i18n.ts`, `lib/format.ts` — English/Amharic copy and shared ETB/date/number formatting
- `app/tg/`, `components/tg/` — Telegram Mini App layout, screens and mobile chrome
- `app/tg-preview/` — laptop demo frame for the Mini App
- `tests/e2e/` — browser test suites (see above)
- `Dockerfile` — Node 22 production container for serving the Next.js front end

All access restrictions and saved records in this demo are client-side only. Replace them with server-side identity, authorization, and tenant/data-isolation checks before production use.
