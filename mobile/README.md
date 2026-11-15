# AddisVenue mobile app

A native iOS and Android app (Expo + React Native) for the AddisVenue backend in the
parent folder. It uses the same API as the website, with simpler screens and every
main task in 3 taps or fewer.

## Run it on your phone (5 minutes)

You need: Node 22+, the **Expo Go** app on your phone (App Store / Play Store), and the
phone and laptop on the **same Wi-Fi**.

```bash
# 1. Start the backend (from the repo root)
pnpm install
pnpm dev                      # serves the API on port 3000

# 2. Start the app (in a second terminal)
cd mobile
npm install
npx expo start
```

Scan the QR code with your phone's camera (iPhone) or with Expo Go (Android).

You don't need to set the backend address during development: the app talks to the laptop
that runs `expo start`, on port 3000.

### Test accounts (after `pnpm db:seed` in the repo root)

| Role | Phone | Password |
|---|---|---|
| Customer | 0915 11 22 33 | password123 |
| Venue manager | 0911 22 33 44 | password123 |
| Vendor | 0911 44 00 01 | password123 |

Or tap **Create account** in the app to sign up as a new customer.

## What each role sees

| Role | Home | Tabs |
|---|---|---|
| Guest / customer | Explore | Explore · Vendors · Bookings · Chats |
| Venue manager | Requests | Requests · Calendar · Messages · My venue |
| Vendor | My listing | (single screen) |
| Admin | "Use the website" | (admin tools stay on the web) |

Guests can browse everything. Sign in is asked only when they send a booking request or
a message, and the request is sent automatically right after they sign in.

### The 3-tap paths

| Job | Taps |
|---|---|
| Book a venue | venue card → green date → **Send request** |
| Ask a venue a question | venue card → **Message** → Send |
| Check a booking | **Bookings** tab (status shown on the card) |
| Contact a vendor | **Vendors** tab → vendor → **Call** |
| Manager: confirm a request | **Confirm** on the request card |
| Manager: block a date | **Calendar** → day → **Block time** |

## Folder map

```
src/
  app/                Screens (Expo Router — one file per screen)
    (customer)/       Customer tabs: index (Explore), vendors, bookings, chats
    (manager)/        Manager tabs: requests, calendar, messages, my-venue
    (vendor)/         listing
    (admin)/          admin
    venue/[id]        Venue page          booking/[id]   Booking details
    vendor/[id]       Vendor page         chat/[id], chat/new
    book              Booking sheet       block          Block-time sheet
    sign-in, sign-up, set-password, me, support, venue-edit, hall-edit
  api/                client.ts (fetch + token), endpoints.ts (one function per route),
                      queries.ts (TanStack Query hooks), types.ts
  auth/               AuthProvider — session token kept in Keychain/Keystore
  features/           Screen building blocks (cards, chat thread, availability rules)
  ui/                 Design-system pieces (Button, Field, Chip, DateStrip, …)
  i18n/               en.ts, am.ts (English / Amharic)
  utils/              Addis-time dates, phone numbers, images, links
  theme.ts            Colours from the website's app/tokens.css
```

## Release builds

1. Put your HTTPS backend URL in `eas.json` (`EXPO_PUBLIC_API_URL`, both profiles).
   Release builds need HTTPS, because Android blocks plain `http://` by default.
2. `npm install -g eas-cli && eas login`
3. Test build you can install directly: `eas build --profile preview --platform android` (APK)
4. Store builds: `eas build --profile production --platform all`, then `eas submit`.

## Checks

```bash
npm run typecheck              # TypeScript
npx expo install --check       # dependency versions match the Expo SDK
```

## Notes

- Times are always shown in Addis Ababa time, whatever the phone's time zone is.
- The Amharic text in `src/i18n/am.ts` should be reviewed by a native speaker before release.
- Prices are not in the backend yet. "Ask for price" opens a chat with the venue.
