/**
 * Database Seed Script — Realistic Addis Ababa Venue Marketplace Data
 *
 * Populates the development database with rich, dynamic data:
 * - 4 Venues with 9 Bookable Halls across Addis Ababa (Bole, Megenagna, Tor Hailoch, Medhanialem)
 * - 4 Venue Managers with credentials (password: 'password123')
 * - 5 Customers with credentials
 * - 1 Super Admin account
 * - Dynamic Bookings across all lifecycle states:
 *     - Confirmed bookings (multi-hall banquets, conferences)
 *     - Requested bookings (awaiting manager re-verification)
 *     - Cancelled bookings (historical audit with released claims)
 * - Off-platform manual SlotBlocks (maintenance, VIP holds)
 *
 * Run with: pnpm db:seed
 */

import "dotenv/config";
import { getDb } from "../lib/db/client";
import {
  accounts,
  credentials,
  sessions,
  venues,
  halls,
  slotClaims,
  bookings,
  bookingHalls,
  inquiryConversations,
  inquiryMessages,
  supportTickets,
  auditLogs,
} from "../lib/db/schema";
import { createAccount, setPassword } from "../lib/services/account-service";
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

function getRelativeDate(daysOffset: number, hour: number = 10, minute: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Starting Addis Venue Marketplace Seeding...\n");

  const db = getDb();

  // 1. Clean existing records in reverse dependency order
  console.log("🧹 Cleaning existing marketplace data...");
  await db.delete(supportTickets);
  await db.delete(auditLogs);
  await db.delete(inquiryMessages);
  await db.delete(inquiryConversations);
  await db.delete(bookingHalls);
  await db.delete(bookings);
  await db.delete(slotClaims);
  await db.delete(halls);
  await db.delete(venues);
  await db.delete(sessions);
  await db.delete(credentials);
  await db.delete(accounts);
  console.log("✓ Database cleaned.\n");

  // 2. Create Super Admin
  console.log("👤 Creating Super Admin...");
  const admin = await createAccount({
    name: "Addis Administrator",
    phone: "+251911000000",
    role: "super_admin",
    telegramId: "tg_admin",
  });
  await setPassword(admin.id, "password123");
  console.log(`✓ Super Admin created: ${admin.name} (${admin.phone})`);

  // 3. Create Venue Managers
  console.log("\n🏨 Creating Venue Managers & Venues...");

  // Manager 1: Skylight Grand Hotel (Bole)
  const mgrAbebe = await createAccount({
    name: "Abebe Kebede",
    phone: "+251911223344",
    role: "venue_manager",
    telegramId: "tg_mgr_a",
  });
  await setPassword(mgrAbebe.id, "password123");

  const venueSkylight = await createVenue({
    managerId: mgrAbebe.id,
    name: "Skylight Grand Hotel",
    area: "Bole",
    type: "Hotel ballroom",
    description: "Premier 5-star venue near Bole International Airport featuring luxury banquet halls, expansive terraces, and state-of-the-art audiovisual support.",
    contactPhone: "+251911223344",
    contactEmail: "banquets@skylightaddis.com",
    amenities: ["Valet Parking (500+ cars)", "High-Speed Wi-Fi", "Full Stage & Pro Lighting", "VIP Changing Rooms", "Backup Generators"],
    policies: "Outside catering not permitted. Acoustic curfews at 23:00 for outdoor terraces.",
  });

  const hallSkylight1 = await createHall(mgrAbebe.id, {
    venueId: venueSkylight.id,
    name: "Imperial Ballroom",
    capacity: 1200,
    setting: "indoor",
    notes: "Divisible into 3 sound-isolated salons. Pillarless hall with 8m ceiling height.",
  });

  const hallSkylight2 = await createHall(mgrAbebe.id, {
    venueId: venueSkylight.id,
    name: "Sky Deck Pavilion",
    capacity: 400,
    setting: "covered-outdoor",
    notes: "Panoramic city views over Bole with automated retractable glass canopy.",
  });

  const hallSkylight3 = await createHall(mgrAbebe.id, {
    venueId: venueSkylight.id,
    name: "Bole Executive Boardroom",
    capacity: 60,
    setting: "indoor",
    notes: "Executive conferencing with dual 85-inch screens and wireless presentation matrix.",
  });

  console.log(`✓ Created: ${venueSkylight.name} (3 halls: Imperial Ballroom, Sky Deck, Boardroom)`);

  // Manager 2: Bellevue Hotel (Central Megenagna)
  const mgrKebede = await createAccount({
    name: "Kebede Tadesse",
    phone: "+251911999902",
    role: "venue_manager",
    telegramId: "tg_mgr_b",
  });
  await setPassword(mgrKebede.id, "password123");

  const venueBellevue = await createVenue({
    managerId: mgrKebede.id,
    name: "Bellevue Hotel",
    area: "Central Megenagna",
    type: "Hotel ballroom",
    description: "Located uphill from Diaspora Square, Bellevue hosts celebrations, weddings, and conferences with scenic hilltop views.",
    contactPhone: "+251911999902",
    contactEmail: "events@bellevueaddis.com",
    amenities: ["Parking for 60 cars", "Dedicated Catering Staff", "Sound System", "Elevator Access"],
    policies: "Flammable items and outside draft tella prohibited. No outside catering.",
  });

  const hallBellevue1 = await createHall(mgrKebede.id, {
    venueId: venueBellevue.id,
    name: "Diaspora Ballroom",
    capacity: 350,
    setting: "indoor",
    notes: "Warm crystal chandeliers, hardwood dance floor, and direct bridal suite entrance.",
  });

  const hallBellevue2 = await createHall(mgrKebede.id, {
    venueId: venueBellevue.id,
    name: "Hillside Terrace Garden",
    capacity: 200,
    setting: "uncovered-outdoor",
    notes: "Landscaped hillside garden overlooking Megenagna valley, ideal for daytime receptions.",
  });

  console.log(`✓ Created: ${venueBellevue.name} (2 halls: Diaspora Ballroom, Hillside Garden)`);

  // Manager 3: Tor Hailoch Golf Club (Tor Hailoch)
  const mgrTigist = await createAccount({
    name: "Tigist Haile",
    phone: "+251911334455",
    role: "venue_manager",
    telegramId: "tg_mgr_c",
  });
  await setPassword(mgrTigist.id, "password123");

  const venueGolf = await createVenue({
    managerId: mgrTigist.id,
    name: "Tor Hailoch Golf Club",
    area: "Tor Hailoch",
    type: "Garden venue",
    description: "Sprawling natural green lawns in Tor Hailoch for grand cultural weddings, massive banquets, and outdoor music showcases.",
    contactPhone: "+251911334455",
    contactEmail: "events@torhailochgolf.com",
    amenities: ["200+ Car Parking", "Outside Catering Permitted", "Open Fairway Lawns", "Tent & Gazebo Rentals"],
    policies: "Outside catering permitted with a 400 ETB per plate kitchen surcharge.",
  });

  const hallGolf1 = await createHall(mgrTigist.id, {
    venueId: venueGolf.id,
    name: "Fairway Grand Lawn",
    capacity: 2500,
    setting: "uncovered-outdoor",
    notes: "Main tournament-grade lawn capable of hosting large marquees and full festival setups.",
  });

  const hallGolf2 = await createHall(mgrTigist.id, {
    venueId: venueGolf.id,
    name: "Clubhouse Banquet Pavilion",
    capacity: 500,
    setting: "covered-outdoor",
    notes: "Sheltered permanent pavilion with open garden verandas and rustic stone fireplaces.",
  });

  console.log(`✓ Created: ${venueGolf.name} (2 halls: Fairway Lawn, Clubhouse Pavilion)`);

  // Manager 4: Harmony Hotel & Suites (Bole Medhanialem)
  const mgrDawitMgr = await createAccount({
    name: "Dawit Zeleke",
    phone: "+251911556677",
    role: "venue_manager",
    telegramId: "tg_mgr_d",
  });
  await setPassword(mgrDawitMgr.id, "password123");

  const venueHarmony = await createVenue({
    managerId: mgrDawitMgr.id,
    name: "Harmony Hotel & Suites",
    area: "Bole Medhanialem",
    type: "Hotel ballroom",
    description: "Bustling central venue across from Medhanialem Cathedral, popular for corporate gatherings, banquets, and social dinners.",
    contactPhone: "+251911556677",
    contactEmail: "banquet@harmonyaddis.com",
    amenities: ["Underground Parking", "Integrated Translation Booths", "Buffet Stations", "High-Tech AV"],
    policies: "Music permitted until 00:00 midnight.",
  });

  const hallHarmony1 = await createHall(mgrDawitMgr.id, {
    venueId: venueHarmony.id,
    name: "Abyssinia Ballroom",
    capacity: 500,
    setting: "indoor",
    notes: "Central ballroom equipped with acoustic wall paneling and professional stage.",
  });

  const hallHarmony2 = await createHall(mgrDawitMgr.id, {
    venueId: venueHarmony.id,
    name: "Sheba Garden Terrace",
    capacity: 150,
    setting: "covered-outdoor",
    notes: "Rooftop terrace garden featuring custom glass pergolas.",
  });

  console.log(`✓ Created: ${venueHarmony.name} (2 halls: Abyssinia Ballroom, Sheba Garden)`);

  // 4. Create Customers
  console.log("\n👥 Creating Customer Accounts...");

  const custDawit = await createAccount({
    name: "Dawit Customer",
    phone: "+251915112233",
    role: "user",
    telegramId: "tg_user_dawit",
  });
  await setPassword(custDawit.id, "password123");

  const custSara = await createAccount({
    name: "Sara Customer",
    phone: "+251915999902",
    role: "user",
    telegramId: "tg_user_sara",
  });
  await setPassword(custSara.id, "password123");

  const custYared = await createAccount({
    name: "Yared Customer",
    phone: "+251915778899",
    role: "user",
    telegramId: "tg_user_yared",
  });
  await setPassword(custYared.id, "password123");

  const custBetty = await createAccount({
    name: "Bethlehem Customer",
    phone: "+251915443322",
    role: "user",
    telegramId: "tg_user_betty",
  });
  await setPassword(custBetty.id, "password123");

  const custElias = await createAccount({
    name: "Elias Customer",
    phone: "+251915667788",
    role: "user",
    telegramId: "tg_user_elias",
  });
  await setPassword(custElias.id, "password123");

  console.log(`✓ 5 Customer accounts created (all with password: 'password123')`);

  // 5. Seed Bookings Across All Lifecycle States
  console.log("\n📅 Seeding Dynamic Bookings & Multi-Hall Invariants...");

  // --- Scenario A: Multi-Hall Confirmed Booking (Dawit books Imperial Ballroom + Sky Deck at Skylight) ---
  const bookingA = await createBooking({
    venueId: venueSkylight.id,
    customerId: custDawit.id,
    hallIds: [hallSkylight1.id, hallSkylight2.id],
    startTime: getRelativeDate(2, 11, 0), // in 2 days from 11:00 to 18:00
    endTime: getRelativeDate(2, 18, 0),
    guestCount: 650,
    notes: "Grand Wedding Banquet & Reception across both ballroom and sky pavilion",
  });
  // Manager Abebe verifies and confirms booking
  await confirmBooking({
    bookingId: bookingA.id,
    callerId: mgrAbebe.id,
  });
  console.log(`✓ [CONFIRMED] Multi-hall booking #${bookingA.id.slice(0, 8)} on Skylight (Imperial + Sky Deck)`);

  // --- Scenario B: Confirmed Corporate Tech Conference (Sara books Abyssinia Ballroom at Harmony) ---
  const bookingB = await createBooking({
    venueId: venueHarmony.id,
    customerId: custSara.id,
    hallIds: [hallHarmony1.id],
    startTime: getRelativeDate(1, 9, 0), // tomorrow from 09:00 to 17:00
    endTime: getRelativeDate(1, 17, 0),
    guestCount: 350,
    notes: "East Africa FinTech Forum 2026",
  });
  await confirmBooking({
    bookingId: bookingB.id,
    callerId: mgrDawitMgr.id,
  });
  console.log(`✓ [CONFIRMED] Booking #${bookingB.id.slice(0, 8)} on Harmony (Abyssinia Ballroom)`);

  // --- Scenario C: Confirmed Luncheon (Bethlehem books Diaspora Ballroom at Bellevue for TODAY) ---
  const bookingC = await createBooking({
    venueId: venueBellevue.id,
    customerId: custBetty.id,
    hallIds: [hallBellevue1.id],
    startTime: getRelativeDate(0, 12, 0), // today 12:00 to 16:00
    endTime: getRelativeDate(0, 16, 0),
    guestCount: 180,
    notes: "Corporate anniversary luncheon & awards ceremony",
  });
  await confirmBooking({
    bookingId: bookingC.id,
    callerId: mgrKebede.id,
  });
  console.log(`✓ [CONFIRMED - TODAY] Booking #${bookingC.id.slice(0, 8)} on Bellevue (Diaspora Ballroom)`);

  // --- Scenario D: Requested Booking Awaiting Re-verification (Yared requests Golf Club Pavilion) ---
  const bookingD = await createBooking({
    venueId: venueGolf.id,
    customerId: custYared.id,
    hallIds: [hallGolf2.id],
    startTime: getRelativeDate(3, 14, 0), // in 3 days 14:00 to 20:00
    endTime: getRelativeDate(3, 20, 0),
    guestCount: 300,
    notes: "Family Golden Jubilee Celebration — awaiting manager slot confirmation",
  });
  console.log(`✓ [REQUESTED] Booking #${bookingD.id.slice(0, 8)} on Golf Club (Clubhouse Pavilion)`);

  // --- Scenario E: Requested Mega Gala (Elias requests Fairway Lawn at Golf Club) ---
  const bookingE = await createBooking({
    venueId: venueGolf.id,
    customerId: custElias.id,
    hallIds: [hallGolf1.id],
    startTime: getRelativeDate(7, 15, 0), // in 7 days 15:00 to 22:00
    endTime: getRelativeDate(7, 22, 0),
    guestCount: 1500,
    notes: "Annual Charity Concert & Gala Dinner",
  });
  console.log(`✓ [REQUESTED] Booking #${bookingE.id.slice(0, 8)} on Golf Club (Fairway Lawn)`);

  // --- Scenario F: Cancelled Booking (Dawit had requested Executive Boardroom, cancelled) ---
  const bookingF = await createBooking({
    venueId: venueSkylight.id,
    customerId: custDawit.id,
    hallIds: [hallSkylight3.id],
    startTime: getRelativeDate(4, 9, 0), // in 4 days 09:00 to 13:00
    endTime: getRelativeDate(4, 13, 0),
    guestCount: 40,
    notes: "Executive quarterly review meeting",
  });
  await cancelBooking({
    bookingId: bookingF.id,
    callerId: custDawit.id,
    reason: "Board meeting rescheduled to next month; slot freed",
  });
  console.log(`✓ [CANCELLED] Booking #${bookingF.id.slice(0, 8)} on Skylight Boardroom (Slot claims released)`);

  // 6. Seed Off-Platform Manual SlotBlocks (Collision Defense)
  console.log("\n🔒 Seeding Off-Platform SlotBlocks (Manager Manual Blocks)...");

  // Block 1: Off-platform State Banquet on Imperial Ballroom tonight
  await createSlotBlock({
    hallId: hallSkylight1.id,
    startTime: getRelativeDate(0, 18, 0), // today 18:00 to 23:00
    endTime: getRelativeDate(0, 23, 0),
    reason: "Off-platform booking: Ministry State Dinner",
    managerId: mgrAbebe.id,
  });
  console.log(`✓ [SLOT-BLOCK] Skylight Imperial Ballroom: Today 18:00 - 23:00 (Ministry State Dinner)`);

  // Block 2: Sound calibration maintenance at Harmony Abyssinia Ballroom
  await createSlotBlock({
    hallId: hallHarmony1.id,
    startTime: getRelativeDate(3, 8, 0), // in 3 days 08:00 to 12:00
    endTime: getRelativeDate(3, 12, 0),
    reason: "Scheduled Acoustic Calibration & Rigging Maintenance",
    managerId: mgrDawitMgr.id,
  });
  console.log(`✓ [SLOT-BLOCK] Harmony Abyssinia Ballroom: In 3 days 08:00 - 12:00 (Maintenance)`);

  // Block 3: Fairway Turf Treatment at Golf Club
  await createSlotBlock({
    hallId: hallGolf1.id,
    startTime: getRelativeDate(1, 6, 0), // tomorrow 06:00 to 11:00
    endTime: getRelativeDate(1, 11, 0),
    reason: "Quarterly Fairway Turf Care & Sprinkler Overhaul",
    managerId: mgrTigist.id,
  });
  console.log(`✓ [SLOT-BLOCK] Golf Club Fairway Lawn: Tomorrow 06:00 - 11:00 (Turf Care)`);

  // 7. Seed Venue Inquiry Conversations & Messages (Phase 6)
  console.log("\n💬 Seeding Pre-Booking Inquiry Conversations...");

  // Inquiry 1: Sara asks Skylight about Coffee Ceremony & Live Band
  const inq1 = await createConversation({
    venueId: venueSkylight.id,
    customerId: custSara.id,
    subject: "Traditional Coffee Ceremony & Live Band Setup",
    initialMessage: "Greetings Abebe, does the Imperial Ballroom package allow setting up a dedicated traditional Ethiopian coffee ceremony in the pre-function area, and can our live band soundcheck at 14:00?",
  });
  await sendMessage({
    conversationId: inq1.id,
    senderId: mgrAbebe.id,
    content: "Selam Sara! Yes, we have a dedicated granite-floored foyer specifically configured for traditional coffee setups with adequate ventilation. Band soundchecks are welcome from 13:30 onwards.",
  });
  await sendMessage({
    conversationId: inq1.id,
    senderId: custSara.id,
    content: "Wonderful! We will finalize our guest list and submit a booking request for the weekend.",
  });
  console.log(`✓ [INQUIRY] Skylight: 3 messages between Sara and Abebe ("Traditional Coffee Ceremony")`);

  // Inquiry 2: Yared asks Bellevue about Parking & Security
  const inq2 = await createConversation({
    venueId: venueBellevue.id,
    customerId: custYared.id,
    subject: "Guest Parking & Bridal Suite Access",
    initialMessage: "Hello Kebede, we are anticipating around 70 vehicles for our evening reception. Is there overflow parking with security guards?",
  });
  await sendMessage({
    conversationId: inq2.id,
    senderId: mgrKebede.id,
    content: "Good afternoon Yared. We have 60 secured spots in our lower gated lot, plus a partnership with the neighboring commercial lot for 40 additional spaces guarded by our security team.",
  });
  console.log(`✓ [INQUIRY] Bellevue: 2 messages between Yared and Kebede ("Guest Parking")`);

  // Inquiry 3: Elias asks Golf Club about Marquee Tents
  const inq3 = await createConversation({
    venueId: venueGolf.id,
    customerId: custElias.id,
    subject: "High-Peak Marquee Setup on Fairway Lawn",
    initialMessage: "Hello Tigist, if we rent the Fairway Grand Lawn for a charity event, does your team provide ground anchoring for heavy hexagonal marquees?",
  });
  console.log(`✓ [INQUIRY] Golf Club: 1 message from Elias ("High-Peak Marquee Setup")`);

  // 7. Seed Support Tickets across states
  console.log("\n🎫 Creating Support Tickets...");
  const t1 = await createTicket({
    authorId: custSara.id,
    category: "booking_dispute",
    subject: "Deposit reconciliation for Skylight Ballroom",
    message: "I sent the 30% advance via CBE Birr on Tuesday, but the venue status hasn't transitioned to confirmed yet.",
  });
  console.log(`✓ [TICKET open] Sara: Deposit reconciliation`);

  const t2 = await createTicket({
    authorId: mgrAbebe.id,
    category: "venue_verification",
    subject: "Commercial business license renewal",
    message: "Uploaded renewed Addis Ababa Trade Bureau license for Skylight Hotel. Please verify for our badge.",
  });
  await updateTicketStatus({
    ticketId: t2.id,
    callerId: admin.id,
    status: "in_progress",
    adminNotes: "Document checked against ministry database, awaiting final tax clearance.",
  });
  console.log(`✓ [TICKET in_progress] Abebe: Commercial license renewal`);

  const t3 = await createTicket({
    authorId: custYared.id,
    category: "billing",
    subject: "VAT receipt request for corporate summit",
    message: "Our finance team requires an electronic VAT invoice with TIN 0038491823.",
  });
  await updateTicketStatus({
    ticketId: t3.id,
    callerId: admin.id,
    status: "resolved",
    adminNotes: "Official VAT receipt issued and dispatched to finance team.",
  });
  console.log(`✓ [TICKET resolved] Yared: VAT receipt request`);

  const t4 = await createTicket({
    authorId: mgrTigist.id,
    category: "technical",
    subject: "Fairway Lawn calendar sync",
    message: "Off-platform golf tournament block placed for next weekend seems to show on the public page correctly. Confirming if notification emails are sent.",
  });
  console.log(`✓ [TICKET open] Tigist: Fairway Lawn calendar sync`);

  console.log("\n========================================================");
  console.log("🎉 SEEDING COMPLETED SUCCESSFULLY!");
  console.log("========================================================");
  console.log("Test Login Credentials (all passwords: 'password123'):");
  console.log("  • Manager A (Skylight Grand Hotel): +251911223344");
  console.log("  • Manager B (Bellevue Hotel):       +251911999902");
  console.log("  • Manager C (Tor Hailoch Golf):     +251911334455");
  console.log("  • Manager D (Harmony Hotel):        +251911556677");
  console.log("  • Customer Dawit:                  +251915112233");
  console.log("  • Customer Sara:                   +251915999902");
  console.log("  • Super Admin:                     +251911000000");
  console.log("========================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed with error:", err);
  process.exit(1);
});
