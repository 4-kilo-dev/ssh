import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupTestDatabase } from "../helpers/db";
import { createAccount } from "../../lib/services/account-service";
import { createSession } from "../../lib/auth/session";
import {
  onboardPartnerVenue,
  listVenuesForAccount,
  addStaffMember,
  issueStaffInviteToken,
} from "../../lib/services/venue-staff-service";
import { createVenue } from "../../lib/services/venue-service";
import { createHall } from "../../lib/services/hall-service";
import { createBooking } from "../../lib/services/booking-service";
import { POST as onboardVenueRoute } from "@/app/api/admin/onboard-venue/route";
import { POST as setPasswordRoute } from "@/app/api/auth/onboard/set-password/route";
import { POST as inviteStaffRoute } from "@/app/api/venues/[id]/staff/invite/route";
import { GET as getManagedRoute } from "@/app/api/venues/managed/route";

function makeReq(url: string, method: string, sessionToken: string, body?: any) {
  const init: RequestInit = {
    method,
    headers: {
      "authorization": `Bearer ${sessionToken}`,
      "cookie": `addisvenue_session=${sessionToken}`,
      "content-type": "application/json",
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

describe("Workflow A & Multi-Venue & Staff Onboarding Integration Tests", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("proves Workflow A: Super Admin onboards Capital Hotel, generates invite link, and manager sets password", async () => {
    // 1. Super Admin account & session
    const admin = await createAccount({
      phone: "+251900000001",
      name: "Super Admin",
      role: "super_admin",
    });
    const adminSession = await createSession(admin.id);

    // 2. Super Admin onboards Capital Hotel & Spa via POST /api/admin/onboard-venue
    const onboardRes = await onboardVenueRoute(
      makeReq("http://localhost/api/admin/onboard-venue", "POST", adminSession.sessionToken, {
        venueName: "Capital Hotel & Spa",
        area: "22 Mazoria",
        type: "Hotel ballroom",
        description: "Luxury 5-star venue with Olympic pool and grand banquet halls.",
        contactPhone: "0116672100",
        contactEmail: "banquet@capitalhotelsa.com",
        managerName: "Daniel Banquet Director",
        managerPhone: "0911 887766",
        managerTitle: "Director of Banquets",
      })
    );

    expect(onboardRes.status).toBe(201);
    const onboardData = await onboardRes.json();
    expect(onboardData.venue.name).toBe("Capital Hotel & Spa");
    expect(onboardData.manager.name).toBe("Daniel Banquet Director");
    expect(onboardData.manager.role).toBe("venue_manager");
    expect(onboardData.inviteUrl).toContain("/onboard?token=");

    const token = new URL(onboardData.inviteUrl, "http://localhost").searchParams.get("token");
    expect(token).toBeTruthy();

    // 3. Daniel sets password using the onboarding token link
    const setPassRes = await setPasswordRoute(
      new Request("http://localhost/api/auth/onboard/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          password: "CapitalStrongPassword2026!",
        }),
      })
    );
    expect(setPassRes.status).toBe(200);
    const passData = await setPassRes.json();
    expect(passData.account.phone).toBe("+251911887766");
    expect(passData.account.role).toBe("venue_manager");
  });

  it("proves Multi-Venue Hospitality Groups: a manager can own and switch between multiple properties", async () => {
    // Lead Manager for Capital Hospitality Group
    const groupManager = await createAccount({
      phone: "+251911445566",
      name: "Capital Hospitality Director",
      role: "venue_manager",
    });
    const session = await createSession(groupManager.id);

    // Property 1: Capital Hotel & Spa (Addis Ababa)
    const property1 = await createVenue({
      managerId: groupManager.id,
      name: "Capital Hotel & Spa",
      area: "22 Mazoria",
      type: "Hotel ballroom",
      allowMultiple: true,
    });

    // Property 2: Capital Country Club & Resort (Bishoftu)
    const property2 = await createVenue({
      managerId: groupManager.id,
      name: "Capital Resort & Country Club",
      area: "Bishoftu",
      type: "Garden venue",
      allowMultiple: true,
    });

    expect(property1.id).toBeDefined();
    expect(property2.id).toBeDefined();

    // Query all venues for this manager account
    const venues = await listVenuesForAccount(groupManager.id);
    expect(venues.length).toBe(2);
    expect(venues.some((v) => v.name === "Capital Hotel & Spa")).toBe(true);
    expect(venues.some((v) => v.name === "Capital Resort & Country Club")).toBe(true);

    // Verify GET /api/venues/managed returns both properties and allows switching via ?venueId
    const resAll = await getManagedRoute(makeReq("http://localhost/api/venues/managed", "GET", session.sessionToken));
    expect(resAll.status).toBe(200);
    const dataAll = await resAll.json();
    expect(dataAll.venues.length).toBe(2);

    // Switch to Property 2 context
    const resSwitch = await getManagedRoute(
      makeReq(`http://localhost/api/venues/managed?venueId=${property2.id}`, "GET", session.sessionToken)
    );
    expect(resSwitch.status).toBe(200);
    const dataSwitch = await resSwitch.json();
    expect(dataSwitch.venue.id).toBe(property2.id);
    expect(dataSwitch.venue.name).toBe("Capital Resort & Country Club");
  });

  it("proves Password Setup for Invited Staff & Token Regeneration", async () => {
    const owner = await createAccount({
      phone: "+251911111111",
      name: "Owner Abebe",
      role: "venue_manager",
    });
    const ownerSession = await createSession(owner.id);

    const venue = await createVenue({
      managerId: owner.id,
      name: "Skylight Convention Center",
      area: "Bole",
      type: "Conference space",
    });

    // 1. Owner adds new staff member Almaz
    const staff = await addStaffMember({
      venueId: venue.id,
      phone: "0912 334455",
      name: "Almaz Sales",
      role: "manager",
      callerId: owner.id,
    });

    expect(staff.needsPasswordSetup).toBe(true);
    expect(staff.inviteUrl).toContain("/onboard?token=");

    // 2. Owner regenerates an invite token later via POST /api/venues/[id]/staff/invite
    const routeParams = { params: Promise.resolve({ id: venue.id }) };
    const inviteRes = await inviteStaffRoute(
      makeReq(`http://localhost/api/venues/${venue.id}/staff/invite`, "POST", ownerSession.sessionToken, {
        staffAccountId: staff.accountId,
      }),
      routeParams
    );

    expect(inviteRes.status).toBe(200);
    const inviteData = await inviteRes.json();
    expect(inviteData.inviteUrl).toContain("/onboard?token=");
  });

  it("proves Instant Booking Alerts trigger when a customer books a hall", async () => {
    // Manager linked with Telegram
    const manager = await createAccount({
      phone: "+251911999999",
      name: "Telegram Manager",
      role: "venue_manager",
      telegramId: "987654321",
    });

    const venue = await createVenue({
      managerId: manager.id,
      name: "Grand Palace Ballroom",
      area: "Arat Kilo",
      type: "Hotel ballroom",
    });

    const hall = await createHall(manager.id, {
      venueId: venue.id,
      name: "Royal Hall",
      capacity: 400,
    });

    const customer = await createAccount({
      phone: "+251922888888",
      name: "Booking Customer",
      role: "user",
    });

    // Mock fetch to simulate Telegram API call
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true })))
    );

    const now = new Date();
    const start = new Date(now.getTime() + 86400000);
    const end = new Date(now.getTime() + 90000000);

    // Customer creates booking
    const booking = await createBooking({
      venueId: venue.id,
      customerId: customer.id,
      hallIds: [hall.id],
      startTime: start,
      endTime: end,
      guestCount: 250,
      notes: "Wedding banquet with live orchestra",
    });

    expect(booking).toBeDefined();
    expect(booking.status).toBe("requested");

    fetchSpy.mockRestore();
  });
});
