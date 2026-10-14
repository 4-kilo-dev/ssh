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

## Project structure

- `app/` — Next.js App Router shell and global styles
- `components/` — customer core flow, vendor flow, Admin workspace, shared application shell and form/list/status patterns
- `lib/mock-data.ts` — seed records and model types
- `lib/store.tsx` — browser-local shared state and simulated state transitions
- `lib/i18n.ts`, `lib/format.ts` — English/Amharic copy and shared ETB/date/number formatting
- `public/manus-routes.json` — public route manifest
- `Dockerfile` — Node 22 production container for serving the Next.js front end

All access restrictions and saved records in this demo are client-side only. Replace them with server-side identity, authorization, and tenant/data-isolation checks before production use.
