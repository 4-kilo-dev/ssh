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
const venueNames = ["Lideta Garden Hall", "Blue Nile Conference House", "Enat Cultural Courtyard", "Meskel View Pavilion", "Addis Heritage House", "Bole Skylight Hall", "Yeka Hillside Venue", "Kirkos Garden Retreat", "Gerji Celebration Hall", "Summit Lakeside Lodge"];
const descriptions = [
  "A welcoming light-filled space for family celebrations and community gatherings.",
  "A flexible event venue with attentive local service and convenient city access.",
  "An airy garden setting with room to celebrate, dine, and make lasting memories.",
  "A practical, well-equipped hall for weddings, conferences, and milestone events.",
];
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
  return { id: `BK-${2100 + i}`, venueId: venue.id, customer: customerNames[i % customerNames.length], eventDate: date,
    guests: Math.min(venue.capacity, 90 + i * 13), packageName: venue.packages[i % 3].name,
    total: venue.packages[i % 3].price, deposit: Math.round(venue.packages[i % 3].price * 0.25), status,
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
