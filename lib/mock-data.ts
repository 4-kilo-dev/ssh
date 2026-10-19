export type BookingStatus = "Requested" | "Reserved" | "Confirmed" | "Completed" | "Canceled";
export type InquiryStatus = "New" | "Responded" | "Confirmed" | "Declined";
export type VendorStatus = "Pending" | "Active" | "Suspended";
export type VendorApplicationStatus = "Pending" | "Needs changes" | "Approved" | "Rejected";
export type PaymentStatus = "Success" | "Failure" | "Pending" | "Refunded";
export type Customer = { id: string; name: string; phone: string; email?: string; eventDate?: string; guests?: number; budgetRange?: string; preferredArea?: string };
export type AdminStaffRole = "Super Admin" | "Venue Manager" | "Vendor Manager" | "Finance";
export type AdminStaff = { id: string; name: string; email: string; role: AdminStaffRole; permissions: string[] };

export type Venue = {
  id: string; name: string; area: string; type: string; capacity: number; price: number;
  description: string; amenities: string[]; packages: { name: string; price: number; description: string }[];
  rating: number; imageLabel: string; mapLink?: string; policies?: string; photos?: string[]; videos?: string[]; contact?: string;
};
export type Vendor = {
  id: string; name: string; category: string; area: string; startingPrice: number;
  services: string[]; status: VendorStatus; description: string; contact?: string;
  applicationStatus?: VendorApplicationStatus; media?: string[]; videos?: string[];
};
export type Booking = {
  id: string; venueId: string; customer: string; eventDate: string; guests: number;
  packageName: string; total: number; deposit: number; status: BookingStatus; createdAt: string;
  source: "Platform" | "Manual"; notes?: string;
};
export type Inquiry = {
  id: string; vendorId: string; customer: string; eventDate: string; detail: string;
  status: InquiryStatus; response?: string;
};
export type Payment = { id: string; bookingId: string; amount: number; status: PaymentStatus; date: string; kind: "Deposit" | "Refund" };
export type FeeStatement = { id: string; vendorId: string; inquiryId: string; amount: number; status: "Outstanding" | "Paid" | "Waived"; date: string };

const areas = ["Bole", "Kazanchis", "Sar Bet", "CMC", "Old Airport", "Yeka", "Piassa", "Mexico", "Gerji", "Summit"];
const venueNames = [" "];
const descriptions = [" "];
const amenities = [["Parking", "Catering", "Garden"], ["Stage", "Projector", "Wi-Fi"], ["Accessible entry", "Parking", "Sound system"], ["Garden", "Changing room", "Catering"]];
const packageNames = ["Essential", "Gather", "Full celebration"];

export const mockVenues: Venue[] = venueNames.map((name, i) => {
  const base = 28000 + i * 4200;
  return {
    id: `venue-${i + 1}`, name, area: areas[i], type: ["Wedding hall", "Garden venue", "Conference space", "Hotel ballroom"][i % 4],
    capacity: 80 + (i * 47) % 420, price: base, description: descriptions[i % descriptions.length],
    amenities: amenities[i % amenities.length], rating: 4.6 - (i % 4) * 0.1, imageLabel: `${areas[i]} event space`,
    packages: packageNames.map((packageName, j) => ({ name: packageName, price: base + j * 18500, description: ["Venue hire and basic setup", "Venue, seating, and service support", "Full setup with catering options"][j] })),
  };
});

mockVenues[0] = {
  ...mockVenues[0],
  name: "Bellevue Hotel",
  area: "Central Megenagna",
  type: "Hotel ballroom",
  capacity: 350,
  price: 2500,
  description: "Bellevue Hotel is uphill from Diaspora Square and hosts birthdays, weddings, and other celebrations for 200–350 guests. Outside catering is not allowed.",
  amenities: ["Parking for 30+ cars", "One hall option", "Three catering options", "Birthdays and weddings"],
  imageLabel: "White floral outdoor wedding stage",
  packages: [
    { name: "Platinum", price: 4000, description: "Platinum catering · 4,000 ETB per plate" },
    { name: "Gold", price: 3250, description: "Gold catering · 3,250 ETB per plate" },
    { name: "Silver", price: 2500, description: "Silver catering · 2,500 ETB per plate" },
  ],
  policies: "Flammable items and Tella (traditional Ethiopian beer) are prohibited. Outside catering is not allowed.",
  photos: ["/images/bellevue.jpg"],
};

mockVenues[1] = {
  ...mockVenues[0],
  id: "venue-2",
  name: "Golf Club",
  area: "Tor Hailoch",
  type: "Garden venue",
  capacity: 4000,
  price: 1500,
  description: "An open-field outdoor venue in Tor Hailoch for birthdays, weddings, and large celebrations of more than 4,000 people.",
  amenities: ["Parking for 200+ cars", "Open field outdoor space", "Outside catering allowed", "Birthdays and weddings"],
  imageLabel: "Outdoor floral event stage",
  packages: [
    { name: "Outside catering", price: 1500, description: "Catering at 1,500 ETB per plate" },
  ],
  policies: "Outside catering is allowed with a 400 ETB per-person outside catering fee.",
  photos: ["/images/Golf.jpg"],
};

mockVenues[2] = {
  ...mockVenues[0],
  id: "venue-3",
  name: "Vibes Hotel and Spa",
  area: "22 to Megenagna",
  type: "Hotel ballroom",
  capacity: 300,
  price: 1800,
  description: "Vibes Hotel and Spa is on the road from 22 to Megenagna, at the turn to the condominium entrance. It accommodates 20–300 guests and hosts birthdays through small-scale concerts.",
  amenities: ["Parking for 50 cars", "Three hall options", "Three catering options", "Birthdays and small-scale concerts"],
  imageLabel: "Vibes Hotel and Spa event hall",
  packages: [
    { name: "Special", price: 1800, description: "Special catering · 1,800 ETB per plate" },
    { name: "Diamond", price: 2300, description: "Diamond catering · 2,300 ETB per plate" },
    { name: "Gold", price: 2800, description: "Gold catering · 2,800 ETB per plate" },
  ],
  policies: "Flammable items and Tella (traditional Ethiopian beer) are prohibited. Beer and soft drinks are excluded; other beverages may be brought in with a corkage fee.",
  photos: ["/images/vibeshotel.jpg"],
};

mockVenues.push(
    {
    id: "venue-11", name: "Kaleb Hotel", area: "Bole / Edna Mall", type: "Hotel ballroom", capacity: 250, price: 1500,
    description: "Kaleb Hotel is just inside from Edna Mall, next to Harmony Hotel. It provides tables, chairs, a stage, a projector, and a sound system for weddings, bridal showers, engagements, graduations, birthdays, and meetings.",
    amenities: ["Parking for 30–50 cars", "Tables and chairs", "Stage, projector, and sound system", "Three hall options"],
    rating: 4.6, imageLabel: "Kaleb Hotel event hall",
    packages: [
      { name: "Diamond", price: 1800, description: "In-house catering per plate" },
      { name: "Gold", price: 1500, description: "In-house catering per plate" },
      { name: "Business", price: 10, description: "Business catering per plate" },
    ],
    policies: "Outside catering is allowed with a corkage fee. Meetings cost 1,350 ETB for a full day or 1,100 ETB for a half day. Events end by 10:00 PM (4:00 LT). Tella and flammable items are prohibited. Book at least one month in advance. Decor must be arranged by the client. Empty halls are also available for rent.",
     photos:["/images/kaleb.jpg"],
    },
  {
    id: "venue-13", name: "Stay Easy Hotel", area: "Addisu Gebeya", type: "Hotel ballroom", capacity: 1000, price: 2000,
    description: "Stay Easy Hotel is next to the Total Gas Station in Addisu Gebeya. It hosts weddings, concerts, bridal showers, graduations, birthdays, and meetings.",
    amenities: ["Parking for 300+ cars", "Tables and chairs", "Stage", "Six or more hall options"],
    rating: 4.6, imageLabel: "Stay Easy Hotel event hall",
    packages: [
      { name: "Hall 1 · 600–1,000 people", price: 2500, description: "In-house catering per plate" },
      { name: "Hall 2 · 150–300 people", price: 2000, description: "In-house catering per plate" },
      { name: "Additional halls", price: 2000, description: "Three additional hall options are available" },
    ],
    policies: "Outside catering is not allowed. In-house catering costs 2,000–2,500 ETB per plate. Events end by 10:00 PM (4:00 LT). Tella and flammable items are prohibited. Book at least one month in advance. Decor must be arranged by the client.",
       photos:["/images/stayeasy.jpg"],
  },
  {
    id: "venue-14", name: "Sapphire Addis", area: "Atlas", type: "Hotel ballroom", capacity: 400, price: 2000,
    description: "Sapphire Addis is in front of Tomoca Coffee in Atlas. It hosts weddings, concerts, bridal showers, graduations, birthdays, and meetings.",
    amenities: ["Parking for 40+ cars", "Tables and chairs", "Stage, speakers, and microphone", "Five hall options"],
    rating: 4.6, imageLabel: "Sapphire Addis event hall",
    packages: [
      { name: "Hall options", price: 2500, description: "Five hall options are available" },
      { name: "In-house catering", price: 2000, description: "In-house catering costs 2,000–2,500 ETB per plate" },
    ],
    policies: "Outside catering is not allowed. In-house catering costs 2,000–2,500 ETB per plate. Events end by 10:00 PM (4:00 LT). Tella and flammable items are prohibited. Book at least five months in advance. Decor must be arranged by the client.",
    photos:["/images/sap.jpg"],
  },
  {
    id: "venue-17", name: "De Leopol Hotel", area: "Urael", type: "Hotel ballroom", capacity: 1000, price: 1500,
    description: "De Leopol Hotel is in Urael, behind Bambis Supermarket. It hosts weddings, concerts, bridal showers, engagements, graduations, birthdays, and meetings.",
    amenities: ["Parking for 375 cars", "Four hall options", "Four catering options"],
    rating: 4.6, imageLabel: "De Leopol Hotel event hall",
    packages: [
      { name: "Platinum", price: 2500, description: "Catering option per plate" },
      { name: "Gold", price: 2000, description: "Catering option per plate" },
      { name: "Silver", price: 1500, description: "Catering option per plate" },
    ],
    policies: "Outside beverages except beer and soft drinks can be brought in with a corkage fee. Tella and flammable items are prohibited.",
    photos:["/images/deo.jpg"],
  },
  {
    id: "venue-19", name: "Golden Tulip Addis Ababa Hotel", area: "Berhane Adere Mall", type: "Hotel ballroom", capacity: 150, price: 2000,
    description: "Golden Tulip Addis Ababa Hotel is 50 meters inside from Berhane Adere Mall. It hosts birthdays and small-scale concerts.",
    amenities: ["Parking for 70 cars", "Seven hall options", "Three wedding halls and four meeting halls"],
    rating: 4.6, imageLabel: "Golden Tulip Addis Ababa Hotel event hall",
    packages: [
      { name: "Platinum", price: 2600, description: "Catering option per plate" },
      { name: "Gold", price: 2300, description: "Catering option per plate" },
      { name: "Silver", price: 2000, description: "Catering option per plate" },
    ],
    policies: "Kitfo and Qurt are allowed for outside catering. All types of beverages can be brought in. Flammable items and outside catering are prohibited.",
    photos:["/images/gold.jpg"]
  },
  {
    id: "venue-15", name: "Elilly International Hotel", area: "Kazanchis", type: "Hotel ballroom", capacity: 1000, price: 2000,
    description: "Elilly International Hotel is in Kazanchis, next to ECA. It hosts weddings, concerts, bridal showers, engagements, graduations, birthdays, and meetings.",
    amenities: ["Parking for 250 cars", "Thirteen hall options", "Platinum, Gold, and Silver catering"],
    rating: 4.6, imageLabel: "Elilly International Hotel event hall",
    packages: [
      { name: "Platinum", price: 2600, description: "Catering option per plate" },
      { name: "Gold", price: 2300, description: "Catering option per plate" },
      { name: "Silver", price: 2000, description: "Catering option per plate" },
    ],
    policies: "Tella and flammable items are prohibited.",
       photos:["/images/eli.jpg"],
  },
  {
    id: "venue-18", name: "Magnolia Hotel", area: "Atlas", type: "Hotel ballroom", capacity: 500, price: 1800,
    description: "Magnolia Hotel is in Atlas, inside from 2000 Habesha and next to Koba Pastry. It hosts birthdays and small-scale concerts.",
    amenities: ["Parking for 50–80 cars", "Three hall options", "Two catering options"],
    rating: 4.6, imageLabel: "Magnolia Hotel event hall",
    packages: [
      { name: "Platinum", price: 2500, description: "Catering option per plate" },
      { name: "Gold", price: 1800, description: "Catering option per plate" },
    ],
    policies: "Wine, whiskey, liquor, Tej, and cake can be brought in with a corkage fee. Outside catering is prohibited. Tella and flammable items are prohibited.",
    photos:["/images/mon.jpg"]
  },
  {
    id: "venue-16", name: "Getfam Hotel", area: "22", type: "Hotel ballroom", capacity: 1000, price: 2000,
    description: "Getfam Hotel is in 22, next to Getahun Besha. It hosts weddings, concerts, bridal showers, graduations, birthdays, and meetings.",
    amenities: ["Parking for 500+ cars", "Seven hall options", "Suite room and spa access for weddings over 400 guests"],
    rating: 4.6, imageLabel: "Getfam Hotel event hall",
    packages: [
      { name: "In-house catering", price: 2000, description: "In-house catering costs 2,000–2,500 ETB per plate" },
      { name: "Large wedding package", price: 2500, description: "For weddings over 400 guests, includes suite room and spa access" },
    ],
    policies: "Outside beverages except beer can be brought in with a corkage fee. In-house catering costs 2,000–2,500 ETB per plate. Events end by 10:00 PM (4:00 LT). Tella and flammable items are prohibited. Book at least six months in advance.",
    photos:["/images/get.jpg"],
  },
   {
    id: "venue-12", name: "Ras Amba Hotel", area: "4 Kilo / Elizabeth Street", type: "Hotel ballroom", capacity: 500, price: 835,
    description: "Ras Amba Hotel at 4 Kilo Shi 80, commonly known as Elizabeth Street. The venue provides tables, chairs, a stage, and a microphone for weddings, concerts, bridal showers, graduations, birthdays, and meetings.",
    amenities: ["Parking for 50+ cars", "Tables and chairs", "Stage and microphone", "Six hall options"],
    rating: 4.6, imageLabel: "Ras Amba Hotel event hall",
    packages: [
      { name: "Hall 1 · 1–500 people", price: 965, description: "In-house catering from 835–965 ETB per plate" },
      { name: "Hall 2 · 1–120 people", price: 835, description: "In-house catering from 835–965 ETB per plate" },
      { name: "Outside catering", price: 1000, description: "Outside catering allowed with a 1,000 ETB corkage fee" },
    ],
    policies: "Events end by 11:00 PM (5:00 LT). Tella and flammable items are prohibited. Book at least one week in advance. Decor may be self-provided or arranged by the hotel.",
    photos:["/images/ras.jpg"],
  },
);

const vendorNames = ["Selam Tesfaye Events", "Abel Photo Studio", "Liya Floral Design", "Kalkidan Catering", "Dawit Sound & Light", "Mimi Bridal House", "Nati Films", "Hana Decor Studio", "Yonas Music Collective", "Bethlehem Cake Atelier", "Tinsae Event Crew", "Mekdes Beauty Lounge"];
const categories = ["Photography", "Catering", "Decor", "Music & sound", "Beauty"];
export const vendorCategories = ["Photography", "Catering", "Decor", "Music & sound", "Beauty"];
export const mockVendors: Vendor[] = vendorNames.map((name, i) => ({
  id: `vendor-${i + 1}`, name, category: categories[i % categories.length], area: areas[(i * 3) % areas.length],
  startingPrice: 4500 + (i * 1600) % 14000,
  services: [["Wedding photography", "Event portraits"], ["Buffet service", "Coffee ceremony"], ["Floral styling", "Table design"], ["PA and lighting", "DJ service"], ["Bridal styling", "Makeup"]][i % 5],
  status: i < 9 ? "Active" : i === 9 ? "Pending" : "Suspended",
  description: `A local ${categories[i % categories.length].toLowerCase()} team serving celebrations across Addis Ababa.`,
}));

const customerNames = ["Hana Bekele", "Dawit Alemu", "Selamawit Tadesse", "Abebe Girma", "Marta Tesfaye", "Nahom Kebede", "Rahel Solomon", "Samuel Haile", "Liya Mekonnen", "Yared Fikru"];
export const mockCustomers: Customer[] = customerNames.map((name, i) => ({ id: `customer-${i + 1}`, name, phone: `+251 91${String(2345678 + i).slice(0, 7)}` }));
export const mockAdminStaff: AdminStaff[] = [
  { id: "staff-1", name: "Marta Tesfaye", email: "marta@example.demo", role: "Super Admin", permissions: ["all"] },
  { id: "staff-2", name: "Biniyam Abebe", email: "biniyam@example.demo", role: "Venue Manager", permissions: ["bookings", "calendar", "venues"] },
  { id: "staff-3", name: "Rahel Solomon", email: "rahel@example.demo", role: "Vendor Manager", permissions: ["vendors", "inquiries"] },
  { id: "staff-4", name: "Samuel Haile", email: "samuel@example.demo", role: "Finance", permissions: ["payments", "revenue", "reports"] },
];

const bookingStatuses: BookingStatus[] = ["Requested", "Reserved", "Confirmed", "Completed", "Canceled"];
export const mockBookings: Booking[] = Array.from({ length: 15 }, (_, i) => {
  const venue = mockVenues[i % mockVenues.length];
  const status = bookingStatuses[i % bookingStatuses.length];
  const date = new Date(Date.UTC(2026, 9 + Math.floor(i / 10), 18 + (i * 3) % 12)).toISOString().slice(0, 10);
  const packageIndex = i % venue.packages.length;
  return { id: `BK-${2100 + i}`, venueId: venue.id, customer: customerNames[i % customerNames.length], eventDate: date,
    guests: Math.min(venue.capacity, 90 + i * 13), packageName: venue.packages[packageIndex].name,
    total: venue.packages[packageIndex].price, deposit: Math.round(venue.packages[packageIndex].price * 0.25), status,
    createdAt: "2026-10-01", source: i % 4 === 0 ? "Manual" : "Platform" };
});

export const mockInquiries: Inquiry[] = Array.from({ length: 20 }, (_, i) => ({
  id: `IN-${3100 + i}`, vendorId: `vendor-${(i % 12) + 1}`, customer: customerNames[(i * 3) % 10],
  eventDate: new Date(Date.UTC(2026, 10, 7 + (i % 20))).toISOString().slice(0, 10),
  detail: ["Seeking event photography for a family celebration.", "Please share catering packages for about 150 guests.", "Looking for decor and setup options for an outdoor event."][i % 3],
  status: (["New", "Responded", "Confirmed", "Declined"] as InquiryStatus[])[i % 4],
  ...(i % 4 === 1 ? { response: "Thank you for reaching out. I can share options for your event date." } : {}),
}));

export const mockPayments: Payment[] = mockBookings.slice(1, 7).map((booking, i) => ({
  id: `PAY-${4100 + i}`, bookingId: booking.id, amount: booking.deposit,
  status: i % 3 === 0 ? "Pending" : "Success", date: "2026-10-12", kind: "Deposit",
}));
export const mockFeeStatements: FeeStatement[] = mockInquiries.slice(1, 7).map((inquiry, i) => ({
  id: `FEE-${5100 + i}`, vendorId: inquiry.vendorId, inquiryId: inquiry.id,
  amount: 750 + i * 250, status: i % 3 === 0 ? "Outstanding" : "Paid", date: "2026-10-11",
}));
export const mockNotifications = [
  { id: "NT-1", title: "Booking request received", detail: "Your event request is ready to review.", date: "2026-10-14", unread: true },
  { id: "NT-2", title: "New vendor response", detail: "A vendor responded to your inquiry.", date: "2026-10-13", unread: true },
  { id: "NT-3", title: "Calendar updated", detail: "A confirmed date is now reserved.", date: "2026-10-12", unread: false },
];

export const initialMockState = {
  venues: mockVenues,
  vendors: mockVendors,
  customers: mockCustomers,
  bookings: mockBookings,
  inquiries: mockInquiries,
  payments: mockPayments,
  fees: mockFeeStatements,
  savedVendors: ["vendor-2", "vendor-8"],
};
