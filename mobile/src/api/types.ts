/**
 * Shapes returned by the AddisVenue backend (see lib/db/schema.ts and the
 * route handlers in app/api). Dates arrive as ISO strings over JSON.
 */

export type Role = "user" | "venue_manager" | "vendor" | "super_admin";

export interface Account {
  id: string;
  name: string;
  phone: string;
  role: Role;
  telegramId: string | null;
}

export type HallSetting = "indoor" | "covered-outdoor" | "uncovered-outdoor";

export interface Venue {
  id: string;
  managerId: string;
  name: string;
  area: string;
  type: string;
  description: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  policies: string | null;
  amenities: string[] | null;
  photos: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Venue as returned by the directory (GET /api/venues). */
export interface VenueListItem extends Venue {
  hallCount: number;
  maxCapacity: number;
}

export interface Hall {
  id: string;
  venueId: string;
  name: string;
  capacity: number;
  setting: HallSetting;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DayPartKey = "morning" | "evening" | "fullDay";

export interface CalendarClaim {
  id: string;
  hallId: string;
  type: "block" | "booking";
  startTime: string;
  endTime: string;
  reason: string | null;
  bookingId: string | null;
}

export interface CalendarDay {
  date: string;
  halls: { hallId: string; free: Record<DayPartKey, boolean> }[];
  /** Only present for the venue's own manager. */
  claims?: CalendarClaim[];
}

export interface VenueCalendar {
  venueId: string;
  from: string;
  to: string;
  dayParts: { key: DayPartKey; start: string; end: string }[];
  halls: { id: string; name: string; capacity: number; setting: HallSetting }[];
  days: CalendarDay[];
}

export type BookingStatus = "requested" | "confirmed" | "cancelled";

export interface VenueSummary {
  id: string;
  name: string;
  area: string;
  type: string;
  photo: string | null;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
}

export interface Booking {
  id: string;
  venueId: string;
  customerId: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  guestCount: number;
  notes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  halls: { id: string; bookingId: string; hallId: string; slotClaimId: string }[];
  venue: VenueSummary | null;
  hallNames: string[];
  /** Only present for the venue manager / admin. */
  customer?: Person | null;
}

export interface Conversation {
  id: string;
  venueId: string;
  customerId: string;
  managerId: string;
  subject: string | null;
  createdAt: string;
  updatedAt: string;
  venue: VenueSummary | null;
  customer: Person | null;
  lastMessage?: { content: string; senderId: string; createdAt: string } | null;
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Vendor {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  description: string | null;
  priceRange: string | null;
  phone: string | null;
  email: string | null;
  area: string | null;
  verified: boolean;
  boostStatus: "standard" | "boosted";
  boostScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
}
