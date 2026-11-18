/**
 * Mobile API support tests
 *
 * Proves the backend additions the native mobile app relies on:
 * 1. Bearer-token sessions (Authorization header) and token-in-body for the mobile client header.
 * 2. Customer self sign-up with Ethiopian phone normalization.
 * 3. Demo sign-in routes are disabled in production unless ALLOW_DEMO_AUTH=true.
 * 4. Venue availability calendar (free day parts per hall, private claims for the owner only).
 * 5. Enriched lists: bookings (venue, hall names, customer for manager),
 *    conversations (venue, last message, unread count) and read receipts.
 * 6. Venue directory stats + guests filter, and the vendor "mine" listing.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { createAccount, setPassword } from "@/lib/services/account-service";
import { createSession, CLIENT_HEADER } from "@/lib/auth/session";
import { createVenue } from "@/lib/services/venue-service";
import { createHall } from "@/lib/services/hall-service";
import { createBooking } from "@/lib/services/booking-service";
import { createVendor } from "@/lib/services/vendor-service";
import { normalizeEthiopianPhone } from "@/lib/phone";
import { addDays, addisTime, todayInAddis } from "@/lib/services/venue-calendar-service";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as demoAdminRoute } from "@/app/api/auth/demo-admin/route";
import { GET as venueAvailabilityRoute } from "@/app/api/venues/[id]/availability/route";
import { GET as listVenuesRoute } from "@/app/api/venues/route";
import { GET as listBookingsRoute } from "@/app/api/bookings/route";
import { POST as createInquiryRoute, GET as listInquiriesRoute } from "@/app/api/inquiries/route";
import { GET as getInquiryRoute } from "@/app/api/inquiries/[id]/route";
import { POST as sendMessageRoute } from "@/app/api/inquiries/[id]/messages/route";
import { GET as listVendorsRoute } from "@/app/api/vendors/route";

const BASE = "http://localhost:3000";

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function jsonPost(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function get(path: string, headers: Record<string, string> = {}) {
  return new Request(`${BASE}${path}`, { headers });
}

function params<T>(value: T) {
  return { params: Promise.resolve(value) };
}

describe("Mobile API support", () => {
  let testDb: TestDbInstance;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("phone normalization", () => {
    it("accepts common Ethiopian formats and rejects others", () => {
      expect(normalizeEthiopianPhone("0911 22 33 44")).toBe("+251911223344");
      expect(normalizeEthiopianPhone("911223344")).toBe("+251911223344");
      expect(normalizeEthiopianPhone("251911223344")).toBe("+251911223344");
      expect(normalizeEthiopianPhone("+251-711-223344")).toBe("+251711223344");
      expect(normalizeEthiopianPhone("0811223344")).toBeNull();
      expect(normalizeEthiopianPhone("12345")).toBeNull();
    });
  });

  describe("bearer sessions", () => {
    it("returns the session token only to the mobile client and accepts it as a Bearer token", async () => {
      const account = await createAccount({ name: "Bearer User", phone: "+251911500001", role: "user" });
      await setPassword(account.id, "MobilePass1!");

      const webRes = await loginRoute(jsonPost("/api/auth/login", { phone: "+251911500001", password: "MobilePass1!" }));
      expect(webRes.status).toBe(200);
      const webData = await webRes.json();
      expect(webData.sessionToken).toBeUndefined();

      const mobileRes = await loginRoute(
        jsonPost("/api/auth/login", { phone: "+251911500001", password: "MobilePass1!" }, { [CLIENT_HEADER]: "mobile" })
      );
      expect(mobileRes.status).toBe(200);
      const mobileData = await mobileRes.json();
      expect(typeof mobileData.sessionToken).toBe("string");

      const meRes = await meRoute(get("/api/auth/me", bearer(mobileData.sessionToken)));
      expect(meRes.status).toBe(200);
      const me = await meRes.json();
      expect(me.account.id).toBe(account.id);

      const badRes = await meRoute(get("/api/auth/me", bearer("not.valid")));
      expect(badRes.status).toBe(401);
    });
  });

  describe("customer sign-up", () => {
    it("creates a customer account with a normalized phone and signs them in", async () => {
      const res = await registerRoute(
        jsonPost(
          "/api/auth/register",
          { name: "  Hana Signup ", phone: "0912 34 56 78", password: "HanaPass2026" },
          { [CLIENT_HEADER]: "mobile" }
        )
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.account.name).toBe("Hana Signup");
      expect(data.account.phone).toBe("+251912345678");
      expect(data.account.role).toBe("user");
      expect(typeof data.sessionToken).toBe("string");

      const login = await loginRoute(jsonPost("/api/auth/login", { phone: "+251912345678", password: "HanaPass2026" }));
      expect(login.status).toBe(200);
    });

    it("rejects duplicates, bad phones and short passwords", async () => {
      const dup = await registerRoute(
        jsonPost("/api/auth/register", { name: "Dup", phone: "+251912345678", password: "HanaPass2026" })
      );
      expect(dup.status).toBe(409);

      const badPhone = await registerRoute(
        jsonPost("/api/auth/register", { name: "Bad", phone: "12345", password: "HanaPass2026" })
      );
      expect(badPhone.status).toBe(400);

      const shortPass = await registerRoute(
        jsonPost("/api/auth/register", { name: "Short", phone: "0913000000", password: "short" })
      );
      expect(shortPass.status).toBe(400);
    });
  });

  describe("demo sign-in guard", () => {
    it("is disabled in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const res = await demoAdminRoute();
      expect(res.status).toBe(404);
    });

    it("can be re-enabled with ALLOW_DEMO_AUTH=true", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ALLOW_DEMO_AUTH", "true");
      const res = await demoAdminRoute();
      expect(res.status).toBe(200);
    });
  });

  describe("venue calendar, lists and chats", () => {
    let managerToken: string;
    let customerToken: string;
    let customerId: string;
    let venueId: string;
    let hallA: string;
    let hallB: string;
    const day = addDays(todayInAddis(), 10);

    beforeAll(async () => {
      const manager = await createAccount({ name: "Calendar Manager", phone: "+251911600001", role: "venue_manager" });
      const customer = await createAccount({ name: "Calendar Customer", phone: "+251911600002", role: "user" });
      customerId = customer.id;
      managerToken = (await createSession(manager.id)).sessionToken;
      customerToken = (await createSession(customer.id)).sessionToken;

      const venue = await createVenue({
        managerId: manager.id,
        name: "Calendar Venue",
        area: "Bole",
        type: "Hotel ballroom",
        photos: ["/images/venue-ballroom.svg"],
      });
      venueId = venue.id;
      hallA = (await createHall(manager.id, { venueId, name: "Hall A", capacity: 300 })).id;
      hallB = (await createHall(manager.id, { venueId, name: "Hall B", capacity: 80 })).id;

      // Customer books Hall A for the evening of `day`
      await createBooking({
        venueId,
        customerId,
        hallIds: [hallA],
        startTime: addisTime(day, 15),
        endTime: addisTime(day, 22),
        guestCount: 250,
        notes: "Private customer note",
      });
    });

    it("reports free day parts per hall and hides claim details from the public", async () => {
      const res = await venueAvailabilityRoute(
        get(`/api/venues/${venueId}/availability?from=${day}&to=${addDays(day, 1)}`),
        params({ id: venueId })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.days).toHaveLength(2);
      expect(data.halls.map((h: { name: string }) => h.name)).toEqual(["Hall A", "Hall B"]);

      const first = data.days[0];
      expect(first.claims).toBeUndefined();
      const a = first.halls.find((h: { hallId: string }) => h.hallId === hallA);
      const b = first.halls.find((h: { hallId: string }) => h.hallId === hallB);
      expect(a.free).toEqual({ morning: true, evening: false, fullDay: false });
      expect(b.free).toEqual({ morning: true, evening: true, fullDay: true });

      const nextDay = data.days[1].halls.find((h: { hallId: string }) => h.hallId === hallA);
      expect(nextDay.free.fullDay).toBe(true);
    });

    it("includes claims for the owning manager only", async () => {
      const mgr = await venueAvailabilityRoute(
        get(`/api/venues/${venueId}/availability?from=${day}&to=${day}`, bearer(managerToken)),
        params({ id: venueId })
      );
      const mgrData = await mgr.json();
      expect(mgrData.days[0].claims).toHaveLength(1);
      expect(mgrData.days[0].claims[0].type).toBe("booking");
      expect(mgrData.days[0].claims[0].bookingId).toBeTruthy();

      const cust = await venueAvailabilityRoute(
        get(`/api/venues/${venueId}/availability?from=${day}&to=${day}`, bearer(customerToken)),
        params({ id: venueId })
      );
      expect((await cust.json()).days[0].claims).toBeUndefined();
    });

    it("rejects invalid or too-long ranges", async () => {
      const bad = await venueAvailabilityRoute(
        get(`/api/venues/${venueId}/availability?from=2026-13-01&to=2026-13-02`),
        params({ id: venueId })
      );
      expect(bad.status).toBe(400);

      const tooLong = await venueAvailabilityRoute(
        get(`/api/venues/${venueId}/availability?from=${day}&to=${addDays(day, 100)}`),
        params({ id: venueId })
      );
      expect(tooLong.status).toBe(400);
    });

    it("adds hall stats to the venue directory and filters by guests", async () => {
      const all = await (await listVenuesRoute(get("/api/venues?query=Calendar"))).json();
      const venue = all.venues.find((v: { id: string }) => v.id === venueId);
      expect(venue.hallCount).toBe(2);
      expect(venue.maxCapacity).toBe(300);

      const big = await (await listVenuesRoute(get("/api/venues?query=Calendar&guests=500"))).json();
      expect(big.venues.find((v: { id: string }) => v.id === venueId)).toBeUndefined();
    });

    it("adds venue and hall names to bookings, and the customer for the manager", async () => {
      const mine = await (await listBookingsRoute(get("/api/bookings", bearer(customerToken)))).json();
      expect(mine[0].venue.name).toBe("Calendar Venue");
      expect(mine[0].venue.photo).toBe("/images/venue-ballroom.svg");
      expect(mine[0].hallNames).toEqual(["Hall A"]);
      expect(mine[0].customer).toBeUndefined();

      const managed = await (await listBookingsRoute(get("/api/bookings", bearer(managerToken)))).json();
      expect(managed[0].customer.name).toBe("Calendar Customer");
      expect(managed[0].customer.phone).toBe("+251911600002");
    });

    it("adds last message and unread count to conversations and clears unread on open", async () => {
      const created = await createInquiryRoute(
        jsonPost("/api/inquiries", { venueId, initialMessage: "Is Hall B free in the morning?" }, bearer(customerToken))
      );
      expect(created.status).toBe(201);
      const conv = await created.json();

      const mgrList = await (await listInquiriesRoute(get("/api/inquiries", bearer(managerToken)))).json();
      const mgrConv = mgrList.find((c: { id: string }) => c.id === conv.id);
      expect(mgrConv.venue.name).toBe("Calendar Venue");
      expect(mgrConv.customer.name).toBe("Calendar Customer");
      expect(mgrConv.lastMessage.content).toBe("Is Hall B free in the morning?");
      expect(mgrConv.unreadCount).toBe(1);

      // Manager opens the thread → read
      const opened = await getInquiryRoute(get(`/api/inquiries/${conv.id}`, bearer(managerToken)), params({ id: conv.id }));
      expect(opened.status).toBe(200);
      const openedData = await opened.json();
      expect(openedData.messages).toHaveLength(1);
      expect(openedData.conversation.venue.name).toBe("Calendar Venue");

      const mgrAfter = await (await listInquiriesRoute(get("/api/inquiries", bearer(managerToken)))).json();
      expect(mgrAfter.find((c: { id: string }) => c.id === conv.id).unreadCount).toBe(0);

      // Manager replies → customer has one unread
      const reply = await sendMessageRoute(
        jsonPost(`/api/inquiries/${conv.id}/messages`, { content: "Yes, it is free." }, bearer(managerToken)),
        params({ id: conv.id })
      );
      expect(reply.status).toBe(201);

      const custList = await (await listInquiriesRoute(get("/api/inquiries", bearer(customerToken)))).json();
      const custConv = custList.find((c: { id: string }) => c.id === conv.id);
      expect(custConv.unreadCount).toBe(1);
      expect(custConv.lastMessage.content).toBe("Yes, it is free.");
    });
  });

  describe("vendor listings", () => {
    it("returns only the signed-in account's vendors for ?mine=true", async () => {
      const owner = await createAccount({ name: "Vendor Owner", phone: "+251911700001", role: "vendor" });
      const other = await createAccount({ name: "Other Vendor", phone: "+251911700002", role: "vendor" });
      await createVendor({ ownerId: owner.id, name: "Owner Photo Studio", category: "Photography" });
      await createVendor({ ownerId: other.id, name: "Other Decor", category: "Decor" });
      const token = (await createSession(owner.id)).sessionToken;

      const res = await listVendorsRoute(get("/api/vendors?mine=true", bearer(token)) as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.vendors.map((v: { name: string }) => v.name)).toEqual(["Owner Photo Studio"]);

      const anon = await listVendorsRoute(get("/api/vendors?mine=true") as any);
      expect(anon.status).toBe(401);
    });
  });
});
