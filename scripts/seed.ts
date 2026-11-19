/**
 * Database Seed Script — Realistic Addis Ababa Venue Marketplace Data
 *
 * Populates or updates the database idempotently:
 * - Does NOT delete existing records (preserves all live/testing data).
 * - Upserts Super Admin, 14 Venue Managers, 5 Customers, 6 Vendors.
 * - Upserts 14 Venues across Addis Ababa with 29 bookable halls.
 * - Safely ensures sample bookings, slot blocks, inquiries, and tickets without duplicate collisions.
 * - Sets/updates passwords for seeded accounts to 'password123'.
 *
 * Run with: pnpm db:seed
 */

import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import {
  accounts,
  venues,
  venueMembers,
  halls,
  slotClaims,
  bookings,
  inquiryConversations,
  supportTickets,
  vendors,
  type Account,
  type AccountRole,
  type Venue,
  type Hall,
  type Vendor,
} from "../lib/db/schema";
import { setPassword } from "../lib/services/account-service";
import { createVenue } from "../lib/services/venue-service";
import { createHall } from "../lib/services/hall-service";
import {
  createBooking,
  confirmBooking,
  cancelBooking,
} from "../lib/services/booking-service";
import { createSlotBlock } from "../lib/services/slot-block-service";
import {
  createConversation,
  sendMessage,
} from "../lib/services/inquiry-service";
import { createTicket, updateTicketStatus } from "../lib/services/ticket-service";
import {
  createVendor,
  setVendorBoost,
  setVendorVerified,
} from "../lib/services/vendor-service";

function getRelativeDate(daysOffset: number, hour: number = 10, minute: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ==========================================
// Idempotent Helpers (No deletion of tables)
// ==========================================

async function upsertAccount(input: {
  name: string;
  phone: string;
  role: AccountRole;
  telegramId?: string | null;
  password?: string;
}): Promise<Account> {
  const db = getDb();
  const normalizedPhone = input.phone.trim();
  let [acc] = await db.select().from(accounts).where(eq(accounts.phone, normalizedPhone)).limit(1);

  if (!acc) {
    [acc] = await db
      .insert(accounts)
      .values({
        name: input.name.trim(),
        phone: normalizedPhone,
        role: input.role,
        telegramId: input.telegramId?.trim() ?? null,
      })
      .returning();
  } else {
    [acc] = await db
      .update(accounts)
      .set({
        name: input.name.trim(),
        role: input.role,
        telegramId: input.telegramId?.trim() ?? acc.telegramId,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, acc.id))
      .returning();
  }

  if (input.password) {
    await setPassword(acc.id, input.password);
  }

  return acc;
}

async function upsertVenue(input: {
  managerId: string;
  name: string;
  area: string;
  type: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  amenities: string[];
  policies: string;
  photos: string[];
}): Promise<Venue> {
  const db = getDb();
  let [venue] = await db.select().from(venues).where(eq(venues.name, input.name)).limit(1);

  if (!venue) {
    venue = await createVenue({
      ...input,
      allowMultiple: true,
    });
  } else {
    [venue] = await db
      .update(venues)
      .set({
        managerId: input.managerId,
        area: input.area,
        type: input.type,
        description: input.description,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        amenities: input.amenities,
        policies: input.policies,
        photos: input.photos,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venue.id))
      .returning();

    // Ensure manager is in venue_members
    await db
      .insert(venueMembers)
      .values({
        venueId: venue.id,
        accountId: input.managerId,
        role: "owner",
        title: "Primary Owner",
        isActive: true,
      })
      .onConflictDoNothing();
  }

  return venue;
}

async function upsertHall(
  managerId: string,
  input: {
    venueId: string;
    name: string;
    capacity: number;
    setting: "indoor" | "covered-outdoor" | "uncovered-outdoor";
    notes?: string;
  }
): Promise<Hall> {
  const db = getDb();
  let [hall] = await db
    .select()
    .from(halls)
    .where(and(eq(halls.venueId, input.venueId), eq(halls.name, input.name)))
    .limit(1);

  if (!hall) {
    hall = await createHall(managerId, input);
  } else {
    [hall] = await db
      .update(halls)
      .set({
        capacity: input.capacity,
        setting: input.setting,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(halls.id, hall.id))
      .returning();
  }

  return hall;
}

async function upsertVendor(
  adminId: string,
  input: {
    ownerId: string;
    name: string;
    category: string;
    description: string;
    priceRange: string;
    phone: string;
    email: string;
    area: string;
    boostStatus?: "standard" | "boosted";
    boostScore?: number;
    verified?: boolean;
  }
): Promise<Vendor> {
  const db = getDb();
  let [vendor] = await db.select().from(vendors).where(eq(vendors.name, input.name)).limit(1);

  if (!vendor) {
    vendor = await createVendor({
      ownerId: input.ownerId,
      name: input.name,
      category: input.category,
      description: input.description,
      priceRange: input.priceRange,
      phone: input.phone,
      email: input.email,
      area: input.area,
    });
  } else {
    [vendor] = await db
      .update(vendors)
      .set({
        ownerId: input.ownerId,
        category: input.category,
        description: input.description,
        priceRange: input.priceRange,
        phone: input.phone,
        email: input.email,
        area: input.area,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, vendor.id))
      .returning();
  }

  if (input.boostStatus) {
    await setVendorBoost({
      vendorId: vendor.id,
      callerId: input.ownerId,
      boostStatus: input.boostStatus,
      boostScore: input.boostScore ?? 0,
    });
  }

  if (input.verified !== undefined) {
    await setVendorVerified({
      vendorId: vendor.id,
      callerId: adminId,
      verified: input.verified,
    });
  }

  return vendor;
}

async function ensureBooking(input: {
  venueId: string;
  customerId: string;
  hallIds: string[];
  startTime: Date;
  endTime: Date;
  guestCount: number;
  notes?: string;
  confirmWithManagerId?: string;
  cancelWithReason?: string;
}) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.customerId, input.customerId),
        eq(bookings.venueId, input.venueId),
        eq(bookings.notes, input.notes ?? "")
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  try {
    const booking = await createBooking({
      venueId: input.venueId,
      customerId: input.customerId,
      hallIds: input.hallIds,
      startTime: input.startTime,
      endTime: input.endTime,
      guestCount: input.guestCount,
      notes: input.notes,
    });

    if (input.confirmWithManagerId) {
      await confirmBooking({
        bookingId: booking.id,
        callerId: input.confirmWithManagerId,
      });
    } else if (input.cancelWithReason) {
      await cancelBooking({
        bookingId: booking.id,
        callerId: input.customerId,
        reason: input.cancelWithReason,
      });
    }

    return booking;
  } catch (err: any) {
    console.warn(`Booking skipped (${err.message})`);
    return null;
  }
}

async function ensureSlotBlock(input: {
  hallId: string;
  managerId: string;
  startTime: Date;
  endTime: Date;
  reason: string;
}) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(slotClaims)
    .where(
      and(
        eq(slotClaims.hallId, input.hallId),
        eq(slotClaims.claimType, "block"),
        eq(slotClaims.reason, input.reason),
        eq(slotClaims.status, "active")
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  try {
    return await createSlotBlock(input);
  } catch (err: any) {
    console.warn(`SlotBlock skipped (${err.message})`);
    return null;
  }
}

async function ensureInquiry(input: {
  venueId: string;
  customerId: string;
  subject: string;
  initialMessage: string;
  followUps?: { senderId: string; content: string }[];
}) {
  const db = getDb();
  let [conv] = await db
    .select()
    .from(inquiryConversations)
    .where(
      and(
        eq(inquiryConversations.venueId, input.venueId),
        eq(inquiryConversations.customerId, input.customerId),
        eq(inquiryConversations.subject, input.subject)
      )
    )
    .limit(1);

  if (conv) {
    return conv;
  }

  conv = await createConversation({
    venueId: input.venueId,
    customerId: input.customerId,
    subject: input.subject,
    initialMessage: input.initialMessage,
  });

  if (input.followUps) {
    for (const f of input.followUps) {
      await sendMessage({
        conversationId: conv.id,
        senderId: f.senderId,
        content: f.content,
      });
    }
  }

  return conv;
}

async function ensureTicket(input: {
  authorId: string;
  category: "venue_verification" | "booking_dispute" | "billing" | "technical" | "other";
  subject: string;
  message: string;
  statusUpdate?: {
    callerId: string;
    status: "open" | "in_progress" | "resolved";
    adminNotes?: string;
  };
}) {
  const db = getDb();
  let [ticket] = await db
    .select()
    .from(supportTickets)
    .where(
      and(
        eq(supportTickets.authorId, input.authorId),
        eq(supportTickets.subject, input.subject)
      )
    )
    .limit(1);

  if (ticket) {
    return ticket;
  }

  ticket = await createTicket({
    authorId: input.authorId,
    category: input.category,
    subject: input.subject,
    message: input.message,
  });

  if (input.statusUpdate) {
    await updateTicketStatus({
      ticketId: ticket.id,
      callerId: input.statusUpdate.callerId,
      status: input.statusUpdate.status,
      adminNotes: input.statusUpdate.adminNotes,
    });
  }

  return ticket;
}

// ==========================================
// Main Seeder (100% Idempotent)
// ==========================================

async function main() {
  console.log("🌱 Starting Addis Venue Marketplace Idempotent Seeding...\n");

  // 1. Super Admin
  console.log("👤 Upserting Super Admin...");
  const admin = await upsertAccount({
    name: "Addis Administrator",
    phone: "+251911000000",
    role: "super_admin",
    telegramId: "tg_admin",
    password: "password123",
  });
  console.log(`✓ Super Admin ready: ${admin.name} (${admin.phone})`);

  // 2. Venue Managers & Venues
  console.log("\n🏨 Upserting Venue Managers & Venues...");

  // Manager 1: Skylight Grand Hotel (Bole)
  const mgrAbebe = await upsertAccount({
    name: "Abebe Kebede",
    phone: "+251911223344",
    role: "venue_manager",
    telegramId: "tg_mgr_a",
    password: "password123",
  });
  const venueSkylight = await upsertVenue({
    managerId: mgrAbebe.id,
    name: "Skylight Grand Hotel",
    area: "Bole",
    type: "Hotel ballroom",
    description: "Premier 5-star venue near Bole International Airport featuring luxury banquet halls, expansive terraces, and state-of-the-art audiovisual support.",
    contactPhone: "+251911223344",
    contactEmail: "banquets@skylightaddis.com",
    amenities: ["Valet Parking (500+ cars)", "High-Speed Wi-Fi", "Full Stage & Pro Lighting", "VIP Changing Rooms", "Backup Generators"],
    policies: "Outside catering not permitted. Acoustic curfews at 23:00 for outdoor terraces.",
    photos: ["/images/landing.jpg"],
  });
  const hallSkylight1 = await upsertHall(mgrAbebe.id, {
    venueId: venueSkylight.id,
    name: "Imperial Ballroom",
    capacity: 1200,
    setting: "indoor",
    notes: "Divisible into 3 sound-isolated salons. Pillarless hall with 8m ceiling height.",
  });
  const hallSkylight2 = await upsertHall(mgrAbebe.id, {
    venueId: venueSkylight.id,
    name: "Sky Deck Pavilion",
    capacity: 400,
    setting: "covered-outdoor",
    notes: "Panoramic city views over Bole with automated retractable glass canopy.",
  });
  const hallSkylight3 = await upsertHall(mgrAbebe.id, {
    venueId: venueSkylight.id,
    name: "Bole Executive Boardroom",
    capacity: 60,
    setting: "indoor",
    notes: "Executive conferencing with dual 85-inch screens and wireless presentation matrix.",
  });
  console.log(`✓ Ready: ${venueSkylight.name} (3 halls)`);

  // Manager 2: Bellevue Hotel (Central Megenagna)
  const mgrKebede = await upsertAccount({
    name: "Kebede Tadesse",
    phone: "+251911999902",
    role: "venue_manager",
    telegramId: "tg_mgr_b",
    password: "password123",
  });
  const venueBellevue = await upsertVenue({
    managerId: mgrKebede.id,
    name: "Bellevue Hotel",
    area: "Central Megenagna",
    type: "Hotel ballroom",
    description: "Located uphill from Diaspora Square, Bellevue hosts celebrations, weddings, and conferences with scenic hilltop views.",
    contactPhone: "+251911999902",
    contactEmail: "events@bellevueaddis.com",
    amenities: ["Parking for 60 cars", "Dedicated Catering Staff", "Sound System", "Elevator Access"],
    policies: "Flammable items and outside draft tella prohibited. No outside catering.",
    photos: ["/images/bellevue.jpg"],
  });
  const hallBellevue1 = await upsertHall(mgrKebede.id, {
    venueId: venueBellevue.id,
    name: "Diaspora Ballroom",
    capacity: 350,
    setting: "indoor",
    notes: "Warm crystal chandeliers, hardwood dance floor, and direct bridal suite entrance.",
  });
  const hallBellevue2 = await upsertHall(mgrKebede.id, {
    venueId: venueBellevue.id,
    name: "Hillside Terrace Garden",
    capacity: 200,
    setting: "uncovered-outdoor",
    notes: "Landscaped hillside garden overlooking Megenagna valley, ideal for daytime receptions.",
  });
  console.log(`✓ Ready: ${venueBellevue.name} (2 halls)`);

  // Manager 3: Tor Hailoch Golf Club (Tor Hailoch)
  const mgrTigist = await upsertAccount({
    name: "Tigist Haile",
    phone: "+251911334455",
    role: "venue_manager",
    telegramId: "tg_mgr_c",
    password: "password123",
  });
  const venueGolf = await upsertVenue({
    managerId: mgrTigist.id,
    name: "Tor Hailoch Golf Club",
    area: "Tor Hailoch",
    type: "Garden venue",
    description: "Sprawling natural green lawns in Tor Hailoch for grand cultural weddings, massive banquets, and outdoor music showcases.",
    contactPhone: "+251911334455",
    contactEmail: "events@torhailochgolf.com",
    amenities: ["200+ Car Parking", "Outside Catering Permitted", "Open Fairway Lawns", "Tent & Gazebo Rentals"],
    policies: "Outside catering permitted with a 400 ETB per plate kitchen surcharge.",
    photos: ["/images/Golf.jpg"],
  });
  const hallGolf1 = await upsertHall(mgrTigist.id, {
    venueId: venueGolf.id,
    name: "Fairway Grand Lawn",
    capacity: 2500,
    setting: "uncovered-outdoor",
    notes: "Main tournament-grade lawn capable of hosting large marquees and full festival setups.",
  });
  const hallGolf2 = await upsertHall(mgrTigist.id, {
    venueId: venueGolf.id,
    name: "Clubhouse Banquet Pavilion",
    capacity: 500,
    setting: "covered-outdoor",
    notes: "Sheltered permanent pavilion with open garden verandas and rustic stone fireplaces.",
  });
  console.log(`✓ Ready: ${venueGolf.name} (2 halls)`);

  // Manager 4: Harmony Hotel & Suites (Bole Medhanialem)
  const mgrDawitMgr = await upsertAccount({
    name: "Dawit Zeleke",
    phone: "+251911556677",
    role: "venue_manager",
    telegramId: "tg_mgr_d",
    password: "password123",
  });
  const venueHarmony = await upsertVenue({
    managerId: mgrDawitMgr.id,
    name: "Harmony Hotel & Suites",
    area: "Bole Medhanialem",
    type: "Hotel ballroom",
    description: "Bustling central venue across from Medhanialem Cathedral, popular for corporate gatherings, banquets, and social dinners.",
    contactPhone: "+251911556677",
    contactEmail: "banquet@harmonyaddis.com",
    amenities: ["Underground Parking", "Integrated Translation Booths", "Buffet Stations", "High-Tech AV"],
    policies: "Music permitted until 00:00 midnight.",
    photos: ["/images/landingtwo.jpg"],
  });
  const hallHarmony1 = await upsertHall(mgrDawitMgr.id, {
    venueId: venueHarmony.id,
    name: "Abyssinia Ballroom",
    capacity: 500,
    setting: "indoor",
    notes: "Central ballroom equipped with acoustic wall paneling and professional stage.",
  });
  const hallHarmony2 = await upsertHall(mgrDawitMgr.id, {
    venueId: venueHarmony.id,
    name: "Sheba Garden Terrace",
    capacity: 150,
    setting: "covered-outdoor",
    notes: "Rooftop terrace garden featuring custom glass pergolas.",
  });
  console.log(`✓ Ready: ${venueHarmony.name} (2 halls)`);

  // Manager 5: Vibes Hotel and Spa (22 to Megenagna)
  const mgrVibes = await upsertAccount({
    name: "Tewodros Kassahun",
    phone: "+251911999903",
    role: "venue_manager",
    password: "password123",
  });
  const venueVibes = await upsertVenue({
    managerId: mgrVibes.id,
    name: "Vibes Hotel and Spa",
    area: "22 to Megenagna",
    type: "Hotel ballroom",
    description: "Vibes Hotel and Spa is on the road from 22 to Megenagna, at the turn to the condominium entrance. It accommodates 20–300 guests and hosts birthdays through small-scale concerts.",
    contactPhone: "+251911999903",
    contactEmail: "events@vibesaddis.com",
    amenities: ["Parking for 50 cars", "Three hall options", "Three catering options", "Birthdays and small-scale concerts"],
    policies: "Flammable items and Tella (traditional Ethiopian beer) are prohibited. Beer and soft drinks are excluded; other beverages may be brought in with a corkage fee.",
    photos: ["/images/vibeshotel.jpg"],
  });
  await upsertHall(mgrVibes.id, {
    venueId: venueVibes.id,
    name: "Diamond Ballroom",
    capacity: 300,
    setting: "indoor",
    notes: "Elegant crystal fixtures, full acoustic wall treatment, and sound booth.",
  });
  await upsertHall(mgrVibes.id, {
    venueId: venueVibes.id,
    name: "Special Salon",
    capacity: 120,
    setting: "indoor",
    notes: "Intimate hall ideal for bridal showers, birthdays, and private dinners.",
  });
  console.log(`✓ Ready: ${venueVibes.name} (2 halls)`);

  // Manager 6: Kaleb Hotel (Bole / Edna Mall)
  const mgrKaleb = await upsertAccount({
    name: "Almaz Bekele",
    phone: "+251911999904",
    role: "venue_manager",
    password: "password123",
  });
  const venueKaleb = await upsertVenue({
    managerId: mgrKaleb.id,
    name: "Kaleb Hotel",
    area: "Bole / Edna Mall",
    type: "Hotel ballroom",
    description: "Kaleb Hotel is just inside from Edna Mall, next to Harmony Hotel. It provides tables, chairs, a stage, a projector, and a sound system for weddings, bridal showers, engagements, graduations, birthdays, and meetings.",
    contactPhone: "+251911999904",
    contactEmail: "banquets@kalebhotel.et",
    amenities: ["Parking for 30–50 cars", "Tables and chairs", "Stage, projector, and sound system", "Three hall options"],
    policies: "Outside catering is allowed with a corkage fee. Meetings cost 1,350 ETB for a full day or 1,100 ETB for a half day. Events end by 10:00 PM (4:00 LT). Tella and flammable items are prohibited. Book at least one month in advance.",
    photos: ["/images/kaleb.jpg"],
  });
  await upsertHall(mgrKaleb.id, {
    venueId: venueKaleb.id,
    name: "Grand Edna Hall",
    capacity: 250,
    setting: "indoor",
    notes: "Complete banquet hall with stage, professional projector, and surround sound.",
  });
  await upsertHall(mgrKaleb.id, {
    venueId: venueKaleb.id,
    name: "Bole Conference Suite",
    capacity: 80,
    setting: "indoor",
    notes: "Equipped boardroom for presentations, meetings, and intimate gatherings.",
  });
  console.log(`✓ Ready: ${venueKaleb.name} (2 halls)`);

  // Manager 7: Stay Easy Hotel (Addisu Gebeya)
  const mgrStayEasy = await upsertAccount({
    name: "Mulugeta Assefa",
    phone: "+251911999905",
    role: "venue_manager",
    password: "password123",
  });
  const venueStayEasy = await upsertVenue({
    managerId: mgrStayEasy.id,
    name: "Stay Easy Hotel",
    area: "Addisu Gebeya",
    type: "Hotel ballroom",
    description: "Stay Easy Hotel is next to the Total Gas Station in Addisu Gebeya. It hosts weddings, concerts, bridal showers, graduations, birthdays, and meetings.",
    contactPhone: "+251911999905",
    contactEmail: "info@stayeasyhotel.et",
    amenities: ["Parking for 300+ cars", "Tables and chairs", "Stage", "Six or more hall options"],
    policies: "Outside catering is not allowed. In-house catering costs 2,000–2,500 ETB per plate. Events end by 10:00 PM (4:00 LT). Tella and flammable items are prohibited. Book at least one month in advance.",
    photos: ["/images/stayeasy.jpg"],
  });
  await upsertHall(mgrStayEasy.id, {
    venueId: venueStayEasy.id,
    name: "Grand Celebration Hall",
    capacity: 1000,
    setting: "indoor",
    notes: "Massive pillarless celebration hall with dedicated backstage and VIP suite.",
  });
  await upsertHall(mgrStayEasy.id, {
    venueId: venueStayEasy.id,
    name: "Terrace Banquet Hall",
    capacity: 300,
    setting: "indoor",
    notes: "Mid-sized hall with private bar setup and exterior terrace access.",
  });
  console.log(`✓ Ready: ${venueStayEasy.name} (2 halls)`);

  // Manager 8: Sapphire Addis (Atlas)
  const mgrSapphire = await upsertAccount({
    name: "Hiwot Girma",
    phone: "+251911999906",
    role: "venue_manager",
    password: "password123",
  });
  const venueSapphire = await upsertVenue({
    managerId: mgrSapphire.id,
    name: "Sapphire Addis",
    area: "Atlas",
    type: "Hotel ballroom",
    description: "Sapphire Addis is in front of Tomoca Coffee in Atlas. It hosts weddings, concerts, bridal showers, graduations, birthdays, and meetings.",
    contactPhone: "+251911999906",
    contactEmail: "events@sapphireaddis.com",
    amenities: ["Parking for 40+ cars", "Tables and chairs", "Stage, speakers, and microphone", "Five hall options"],
    policies: "Outside catering is not allowed. In-house catering costs 2,000–2,500 ETB per plate. Events end by 10:00 PM (4:00 LT). Tella and flammable items are prohibited. Book at least five months in advance.",
    photos: ["/images/sap.jpg"],
  });
  await upsertHall(mgrSapphire.id, {
    venueId: venueSapphire.id,
    name: "Sapphire Crystal Hall",
    capacity: 400,
    setting: "indoor",
    notes: "Luxury ballroom with ornate chandeliers and direct elevator access.",
  });
  await upsertHall(mgrSapphire.id, {
    venueId: venueSapphire.id,
    name: "Atlas Executive Lounge",
    capacity: 120,
    setting: "indoor",
    notes: "Cozy private room for receptions, dinners, and small engagements.",
  });
  console.log(`✓ Ready: ${venueSapphire.name} (2 halls)`);

  // Manager 9: De Leopol Hotel (Urael)
  const mgrDeLeopol = await upsertAccount({
    name: "Yohannes Mengistu",
    phone: "+251911999907",
    role: "venue_manager",
    password: "password123",
  });
  const venueDeLeopol = await upsertVenue({
    managerId: mgrDeLeopol.id,
    name: "De Leopol Hotel",
    area: "Urael",
    type: "Hotel ballroom",
    description: "De Leopol Hotel is in Urael, behind Bambis Supermarket. It hosts weddings, concerts, bridal showers, engagements, graduations, birthdays, and meetings.",
    contactPhone: "+251911999907",
    contactEmail: "sales@deleopolhotel.et",
    amenities: ["Parking for 375 cars", "Four hall options", "Four catering options"],
    policies: "Outside beverages except beer and soft drinks can be brought in with a corkage fee. Tella and flammable items are prohibited.",
    photos: ["/images/deo.jpg"],
  });
  await upsertHall(mgrDeLeopol.id, {
    venueId: venueDeLeopol.id,
    name: "Leopol Grand Ballroom",
    capacity: 1000,
    setting: "indoor",
    notes: "Expansive ballroom with private entrance, stage, and integrated lighting.",
  });
  await upsertHall(mgrDeLeopol.id, {
    venueId: venueDeLeopol.id,
    name: "Bambis Garden Salon",
    capacity: 350,
    setting: "covered-outdoor",
    notes: "Covered veranda with garden perimeter, ideal for wedding cocktail hours.",
  });
  console.log(`✓ Ready: ${venueDeLeopol.name} (2 halls)`);

  // Manager 10: Golden Tulip Addis Ababa Hotel (Berhane Adere Mall)
  const mgrGoldenTulip = await upsertAccount({
    name: "Solomon Worku",
    phone: "+251911999908",
    role: "venue_manager",
    password: "password123",
  });
  const venueGoldenTulip = await upsertVenue({
    managerId: mgrGoldenTulip.id,
    name: "Golden Tulip Addis Ababa Hotel",
    area: "Berhane Adere Mall",
    type: "Hotel ballroom",
    description: "Golden Tulip Addis Ababa Hotel is 50 meters inside from Berhane Adere Mall. It hosts birthdays and small-scale concerts.",
    contactPhone: "+251911999908",
    contactEmail: "banqueting@goldentulipaddis.com",
    amenities: ["Parking for 70 cars", "Seven hall options", "Three wedding halls and four meeting halls"],
    policies: "Kitfo and Qurt are allowed for outside catering. All types of beverages can be brought in. Flammable items and outside catering are prohibited.",
    photos: ["/images/gold.jpg"],
  });
  await upsertHall(mgrGoldenTulip.id, {
    venueId: venueGoldenTulip.id,
    name: "Tulip Banquet Salon",
    capacity: 150,
    setting: "indoor",
    notes: "Upscale dining and celebration salon with international audio-video support.",
  });
  await upsertHall(mgrGoldenTulip.id, {
    venueId: venueGoldenTulip.id,
    name: "Adere Meeting Hall",
    capacity: 60,
    setting: "indoor",
    notes: "Private executive room for corporate meetings and family dinners.",
  });
  console.log(`✓ Ready: ${venueGoldenTulip.name} (2 halls)`);

  // Manager 11: Elilly International Hotel (Kazanchis)
  const mgrElilly = await upsertAccount({
    name: "Rahel Berhanu",
    phone: "+251911999909",
    role: "venue_manager",
    password: "password123",
  });
  const venueElilly = await upsertVenue({
    managerId: mgrElilly.id,
    name: "Elilly International Hotel",
    area: "Kazanchis",
    type: "Hotel ballroom",
    description: "Elilly International Hotel is in Kazanchis, next to ECA. It hosts weddings, concerts, bridal showers, engagements, graduations, birthdays, and meetings.",
    contactPhone: "+251911999909",
    contactEmail: "banquet@elillyhotel.com",
    amenities: ["Parking for 250 cars", "Thirteen hall options", "Platinum, Gold, and Silver catering"],
    policies: "Tella and flammable items are prohibited.",
    photos: ["/images/eli.jpg"],
  });
  await upsertHall(mgrElilly.id, {
    venueId: venueElilly.id,
    name: "Queen Sheba Ballroom",
    capacity: 1000,
    setting: "indoor",
    notes: "Grand Kazanchis ballroom, high ceilings, VIP dressing rooms, and stage.",
  });
  await upsertHall(mgrElilly.id, {
    venueId: venueElilly.id,
    name: "Blue Nile Banquet Hall",
    capacity: 400,
    setting: "indoor",
    notes: "Versatile medium banquet space with dedicated buffet and beverage stations.",
  });
  console.log(`✓ Ready: ${venueElilly.name} (2 halls)`);

  // Manager 12: Magnolia Hotel (Atlas)
  const mgrMagnolia = await upsertAccount({
    name: "Henok Fisseha",
    phone: "+251911999910",
    role: "venue_manager",
    password: "password123",
  });
  const venueMagnolia = await upsertVenue({
    managerId: mgrMagnolia.id,
    name: "Magnolia Hotel",
    area: "Atlas",
    type: "Hotel ballroom",
    description: "Magnolia Hotel is in Atlas, inside from 2000 Habesha and next to Koba Pastry. It hosts birthdays and small-scale concerts.",
    contactPhone: "+251911999910",
    contactEmail: "events@magnoliaaddis.et",
    amenities: ["Parking for 50–80 cars", "Three hall options", "Two catering options"],
    policies: "Wine, whiskey, liquor, Tej, and cake can be brought in with a corkage fee. Outside catering is prohibited. Tella and flammable items are prohibited.",
    photos: ["/images/mon.jpg"],
  });
  await upsertHall(mgrMagnolia.id, {
    venueId: venueMagnolia.id,
    name: "Magnolia Grand Hall",
    capacity: 500,
    setting: "indoor",
    notes: "Modern banquet hall with mood lighting, sound control, and stage.",
  });
  await upsertHall(mgrMagnolia.id, {
    venueId: venueMagnolia.id,
    name: "Koba Terrace Pavilion",
    capacity: 150,
    setting: "covered-outdoor",
    notes: "Covered terrace garden pavilion overlooking Atlas area.",
  });
  console.log(`✓ Ready: ${venueMagnolia.name} (2 halls)`);

  // Manager 13: Getfam Hotel (22)
  const mgrGetfam = await upsertAccount({
    name: "Kidist Alemu",
    phone: "+251911999911",
    role: "venue_manager",
    password: "password123",
  });
  const venueGetfam = await upsertVenue({
    managerId: mgrGetfam.id,
    name: "Getfam Hotel",
    area: "22",
    type: "Hotel ballroom",
    description: "Getfam Hotel is in 22, next to Getahun Besha. It hosts weddings, concerts, bridal showers, graduations, birthdays, and meetings.",
    contactPhone: "+251911999911",
    contactEmail: "banquets@getfamhotel.com",
    amenities: ["Parking for 500+ cars", "Seven hall options", "Suite room and spa access for weddings over 400 guests"],
    policies: "Outside beverages except beer can be brought in with a corkage fee. In-house catering costs 2,000–2,500 ETB per plate. Events end by 10:00 PM (4:00 LT). Tella and flammable items are prohibited. Book at least six months in advance.",
    photos: ["/images/get.jpg"],
  });
  await upsertHall(mgrGetfam.id, {
    venueId: venueGetfam.id,
    name: "Getfam Imperial Hall",
    capacity: 1000,
    setting: "indoor",
    notes: "5-star ballroom with VIP suite access, translation booths, and high ceilings.",
  });
  await upsertHall(mgrGetfam.id, {
    venueId: venueGetfam.id,
    name: "Besha Grand Salon",
    capacity: 450,
    setting: "indoor",
    notes: "Spacious hall suited for gala dinners, conferences, and engagements.",
  });
  console.log(`✓ Ready: ${venueGetfam.name} (2 halls)`);

  // Manager 14: Ras Amba Hotel (4 Kilo / Elizabeth Street)
  const mgrRasAmba = await upsertAccount({
    name: "Fikadu Tefera",
    phone: "+251911999912",
    role: "venue_manager",
    password: "password123",
  });
  const venueRasAmba = await upsertVenue({
    managerId: mgrRasAmba.id,
    name: "Ras Amba Hotel",
    area: "4 Kilo / Elizabeth Street",
    type: "Hotel ballroom",
    description: "Ras Amba Hotel at 4 Kilo Shi 80, commonly known as Elizabeth Street. The venue provides tables, chairs, a stage, and a microphone for weddings, concerts, bridal showers, graduations, birthdays, and meetings.",
    contactPhone: "+251911999912",
    contactEmail: "events@rasambahotel.et",
    amenities: ["Parking for 50+ cars", "Tables and chairs", "Stage and microphone", "Six hall options"],
    policies: "Events end by 11:00 PM (5:00 LT). Tella and flammable items are prohibited. Book at least one week in advance. Decor may be self-provided or arranged by the hotel.",
    photos: ["/images/ras.jpg"],
  });
  await upsertHall(mgrRasAmba.id, {
    venueId: venueRasAmba.id,
    name: "Ras Amba Celebration Hall",
    capacity: 500,
    setting: "indoor",
    notes: "Historic hall overlooking Addis valley with stage and PA system.",
  });
  await upsertHall(mgrRasAmba.id, {
    venueId: venueRasAmba.id,
    name: "Elizabeth Terrace Hall",
    capacity: 120,
    setting: "indoor",
    notes: "Panoramic rooftop banquet room for intimate gatherings.",
  });
  console.log(`✓ Ready: ${venueRasAmba.name} (2 halls)`);

  // 3. Customer Accounts
  console.log("\n👥 Upserting Customer Accounts...");
  const custDawit = await upsertAccount({
    name: "Dawit Customer",
    phone: "+251915112233",
    role: "user",
    telegramId: "tg_user_dawit",
    password: "password123",
  });
  const custSara = await upsertAccount({
    name: "Sara Customer",
    phone: "+251915999902",
    role: "user",
    telegramId: "tg_user_sara",
    password: "password123",
  });
  const custBetty = await upsertAccount({
    name: "Bethlehem Customer",
    phone: "+251915443322",
    role: "user",
    telegramId: "tg_user_betty",
    password: "password123",
  });
  const custYared = await upsertAccount({
    name: "Yared Customer",
    phone: "+251915778899",
    role: "user",
    telegramId: "tg_user_yared",
    password: "password123",
  });
  const custElias = await upsertAccount({
    name: "Elias Customer",
    phone: "+251915667788",
    role: "user",
    telegramId: "tg_user_elias",
    password: "password123",
  });
  console.log("✓ 5 Customer accounts ready (password: 'password123')");

  // 4. Sample Bookings (Non-destructive)
  console.log("\n📅 Ensuring Bookings Lifecycle Invariants...");
  await ensureBooking({
    venueId: venueSkylight.id,
    customerId: custDawit.id,
    hallIds: [hallSkylight1.id, hallSkylight2.id],
    startTime: getRelativeDate(2, 11, 0),
    endTime: getRelativeDate(2, 18, 0),
    guestCount: 650,
    notes: "Grand Wedding Banquet & Reception across both ballroom and sky pavilion",
    confirmWithManagerId: mgrAbebe.id,
  });

  await ensureBooking({
    venueId: venueHarmony.id,
    customerId: custSara.id,
    hallIds: [hallHarmony1.id],
    startTime: getRelativeDate(1, 9, 0),
    endTime: getRelativeDate(1, 17, 0),
    guestCount: 350,
    notes: "East Africa FinTech Forum 2026",
    confirmWithManagerId: mgrDawitMgr.id,
  });

  await ensureBooking({
    venueId: venueBellevue.id,
    customerId: custBetty.id,
    hallIds: [hallBellevue1.id],
    startTime: getRelativeDate(0, 12, 0),
    endTime: getRelativeDate(0, 16, 0),
    guestCount: 180,
    notes: "Corporate anniversary luncheon & awards ceremony",
    confirmWithManagerId: mgrKebede.id,
  });

  await ensureBooking({
    venueId: venueGolf.id,
    customerId: custYared.id,
    hallIds: [hallGolf2.id],
    startTime: getRelativeDate(3, 14, 0),
    endTime: getRelativeDate(3, 20, 0),
    guestCount: 300,
    notes: "Family Golden Jubilee Celebration — awaiting manager slot confirmation",
  });

  await ensureBooking({
    venueId: venueGolf.id,
    customerId: custElias.id,
    hallIds: [hallGolf1.id],
    startTime: getRelativeDate(7, 15, 0),
    endTime: getRelativeDate(7, 22, 0),
    guestCount: 1500,
    notes: "Annual Charity Concert & Gala Dinner",
  });

  await ensureBooking({
    venueId: venueSkylight.id,
    customerId: custDawit.id,
    hallIds: [hallSkylight3.id],
    startTime: getRelativeDate(4, 9, 0),
    endTime: getRelativeDate(4, 13, 0),
    guestCount: 40,
    notes: "Executive quarterly review meeting",
    cancelWithReason: "Board meeting rescheduled to next month; slot freed",
  });
  console.log("✓ Sample bookings verified");

  // 5. SlotBlocks (Off-platform holds)
  console.log("\n🔒 Ensuring Off-Platform SlotBlocks...");
  await ensureSlotBlock({
    hallId: hallSkylight1.id,
    startTime: getRelativeDate(0, 18, 0),
    endTime: getRelativeDate(0, 23, 0),
    reason: "Off-platform booking: Ministry State Dinner",
    managerId: mgrAbebe.id,
  });

  await ensureSlotBlock({
    hallId: hallHarmony1.id,
    startTime: getRelativeDate(3, 8, 0),
    endTime: getRelativeDate(3, 12, 0),
    reason: "Scheduled Acoustic Calibration & Rigging Maintenance",
    managerId: mgrDawitMgr.id,
  });

  await ensureSlotBlock({
    hallId: hallGolf1.id,
    startTime: getRelativeDate(1, 6, 0),
    endTime: getRelativeDate(1, 11, 0),
    reason: "Quarterly Fairway Turf Care & Sprinkler Overhaul",
    managerId: mgrTigist.id,
  });
  console.log("✓ Slot blocks verified");

  // 6. Pre-booking Inquiries
  console.log("\n💬 Ensuring Inquiry Conversations...");
  await ensureInquiry({
    venueId: venueSkylight.id,
    customerId: custSara.id,
    subject: "Traditional Coffee Ceremony & Live Band Setup",
    initialMessage: "Greetings Abebe, does the Imperial Ballroom package allow setting up a dedicated traditional Ethiopian coffee ceremony in the pre-function area, and can our live band soundcheck at 14:00?",
    followUps: [
      {
        senderId: mgrAbebe.id,
        content: "Selam Sara! Yes, we have a dedicated granite-floored foyer specifically configured for traditional coffee setups with adequate ventilation. Band soundchecks are welcome from 13:30 onwards.",
      },
      {
        senderId: custSara.id,
        content: "Wonderful! We will finalize our guest list and submit a booking request for the weekend.",
      },
    ],
  });

  await ensureInquiry({
    venueId: venueBellevue.id,
    customerId: custYared.id,
    subject: "Guest Parking & Bridal Suite Access",
    initialMessage: "Hello Kebede, we are anticipating around 70 vehicles for our evening reception. Is there overflow parking with security guards?",
    followUps: [
      {
        senderId: mgrKebede.id,
        content: "Good afternoon Yared. We have 60 secured spots in our lower gated lot, plus a partnership with the neighboring commercial lot for 40 additional spaces guarded by our security team.",
      },
    ],
  });

  await ensureInquiry({
    venueId: venueGolf.id,
    customerId: custElias.id,
    subject: "High-Peak Marquee Setup on Fairway Lawn",
    initialMessage: "Hello Tigist, if we rent the Fairway Grand Lawn for a charity event, does your team provide ground anchoring for heavy hexagonal marquees?",
  });
  console.log("✓ Inquiries verified");

  // 7. Support Tickets
  console.log("\n🎫 Ensuring Support Tickets...");
  await ensureTicket({
    authorId: custSara.id,
    category: "booking_dispute",
    subject: "Deposit reconciliation for Skylight Ballroom",
    message: "I sent the 30% advance via CBE Birr on Tuesday, but the venue status hasn't transitioned to confirmed yet.",
  });

  await ensureTicket({
    authorId: mgrAbebe.id,
    category: "venue_verification",
    subject: "Commercial business license renewal",
    message: "Uploaded renewed Addis Ababa Trade Bureau license for Skylight Hotel. Please verify for our badge.",
    statusUpdate: {
      callerId: admin.id,
      status: "in_progress",
      adminNotes: "Document checked against ministry database, awaiting final tax clearance.",
    },
  });

  await ensureTicket({
    authorId: custYared.id,
    category: "billing",
    subject: "VAT receipt request for corporate summit",
    message: "Our finance team requires an electronic VAT invoice with TIN 0038491823.",
    statusUpdate: {
      callerId: admin.id,
      status: "resolved",
      adminNotes: "Official VAT receipt issued and dispatched to finance team.",
    },
  });

  await ensureTicket({
    authorId: mgrTigist.id,
    category: "technical",
    subject: "Fairway Lawn calendar sync",
    message: "Off-platform golf tournament block placed for next weekend seems to show on the public page correctly. Confirming if notification emails are sent.",
  });
  console.log("✓ Support tickets verified");

  // 8. Event Vendors
  console.log("\n✨ Upserting Event Vendors...");
  const accSelam = await upsertAccount({
    name: "Selamawit Photography",
    phone: "+251911440001",
    role: "vendor",
    telegramId: "tg_vendor_demo",
    password: "password123",
  });
  await upsertVendor(admin.id, {
    ownerId: accSelam.id,
    name: "Selamawit Fine Art Photography",
    category: "Photography",
    description: "Capturing authentic Ethiopian wedding moments, traditional melse ceremonies, and gala summits.",
    priceRange: "ETB 35,000 - 90,000",
    phone: "+251911440001",
    email: "selamawit@addisvisuals.et",
    area: "Bole",
    boostStatus: "boosted",
    boostScore: 100,
    verified: true,
  });

  const accFikru = await upsertAccount({
    name: "Fikru Royal Catering",
    phone: "+251911440002",
    role: "vendor",
    password: "password123",
  });
  await upsertVendor(admin.id, {
    ownerId: accFikru.id,
    name: "Finfinne Royal Catering",
    category: "Catering",
    description: "Exceptional culinary experiences combining traditional Ethiopian feasts and continental banquets.",
    priceRange: "ETB 450 - 950 per guest",
    phone: "+251911440002",
    email: "info@finfinneroyal.et",
    area: "Kazanchis",
    boostStatus: "boosted",
    boostScore: 75,
    verified: true,
  });

  const accMartha = await upsertAccount({
    name: "Martha Decor",
    phone: "+251911440003",
    role: "vendor",
    password: "password123",
  });
  await upsertVendor(admin.id, {
    ownerId: accMartha.id,
    name: "Enat Wedding Stage & Florals",
    category: "Decor & Stage",
    description: "Modern bespoke floral arches, luxury crystal chandeliers, and grand Ethiopian bridal stages.",
    priceRange: "ETB 60,000 - 180,000",
    phone: "+251911440003",
    email: "decor@enatwedding.et",
    area: "Bole",
    verified: true,
  });

  const accGenet = await upsertAccount({
    name: "Genet Traditional Wear",
    phone: "+251911440004",
    role: "vendor",
    password: "password123",
  });
  await upsertVendor(admin.id, {
    ownerId: accGenet.id,
    name: "Zemen Traditional Bridal Attire",
    category: "Traditional Attire",
    description: "Handwoven luxury Shewa and Gondar style bridal habesha kemis with custom gold embroidery.",
    priceRange: "ETB 15,000 - 45,000",
    phone: "+251911440004",
    email: "zemen@addisattire.et",
    area: "Old Airport",
    verified: true,
  });

  const accErmias = await upsertAccount({
    name: "Ermias Sound",
    phone: "+251911440005",
    role: "vendor",
    password: "password123",
  });
  await upsertVendor(admin.id, {
    ownerId: accErmias.id,
    name: "Sheger Groove Sound & Lighting",
    category: "Sound & DJ",
    description: "Line-array concert grade acoustics, digital wireless mics, intelligent beam lighting, and wedding DJs.",
    priceRange: "ETB 25,000 - 65,000",
    phone: "+251911440005",
    email: "shegergroove@sound.et",
    area: "Piazza",
  });

  const accRuth = await upsertAccount({
    name: "Ruth Pastry",
    phone: "+251911440006",
    role: "vendor",
    password: "password123",
  });
  await upsertVendor(admin.id, {
    ownerId: accRuth.id,
    name: "Entoto Sweet Treats & Wedding Cakes",
    category: "Cake & Pastry",
    description: "Multi-tiered artisanal wedding cakes, French macarons, and decadent dessert banquet tables.",
    priceRange: "ETB 12,000 - 35,000",
    phone: "+251911440006",
    email: "ruth@entotocakes.et",
    area: "Tor Hailoch",
  });
  console.log("✓ Vendors verified");

  console.log("\n========================================================");
  console.log("🎉 IDEMPOTENT SEEDING COMPLETED SUCCESSFULLY!");
  console.log("========================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed with error:", err);
  process.exit(1);
});
