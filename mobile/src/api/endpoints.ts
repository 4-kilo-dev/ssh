/**
 * One function per backend endpoint. Screens never call fetch directly, and
 * the backend's different response shapes ({status, venues}, bare arrays,
 * {vendors}) are unwrapped here so screens always get plain data.
 */
import { api } from "./client";
import type {
  Account,
  Booking,
  Conversation,
  Hall,
  HallSetting,
  Message,
  SupportTicket,
  Vendor,
  Venue,
  VenueCalendar,
  VenueListItem,
} from "./types";

const q = (params: Record<string, string | number | undefined | null>) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ) as [string, string | number][];
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
};

/* ---------------- Auth ---------------- */

export interface AuthResult {
  account: Account;
  sessionToken: string;
}

export const authApi = {
  login: (phone: string, password: string) =>
    api<AuthResult>("/api/auth/login", { method: "POST", body: { phone, password } }),
  register: (name: string, phone: string, password: string) =>
    api<AuthResult>("/api/auth/register", { method: "POST", body: { name, phone, password } }),
  setPassword: (token: string, password: string) =>
    api<AuthResult>("/api/auth/onboard/set-password", { method: "POST", body: { token, password } }),
  me: async () => (await api<{ account: Account }>("/api/auth/me")).account,
  logout: () => api<{ status: string }>("/api/auth/logout", { method: "POST" }),
};

/* ---------------- Venues ---------------- */

export const venueApi = {
  list: async (params: { query?: string; guests?: number } = {}) =>
    (await api<{ venues: VenueListItem[] }>(`/api/venues${q(params)}`)).venues,
  get: (id: string) => api<{ venue: Venue; halls: Hall[] }>(`/api/venues/${id}`),
  calendar: (id: string, from: string, to: string) =>
    api<VenueCalendar>(`/api/venues/${id}/availability${q({ from, to })}`),

  // Venue manager
  create: async (input: VenueInput) =>
    (await api<{ venue: Venue }>("/api/venues", { method: "POST", body: input })).venue,
  update: async (id: string, input: Partial<VenueInput>) =>
    (await api<{ venue: Venue }>(`/api/venues/${id}`, { method: "PUT", body: input })).venue,
  createHall: async (venueId: string, input: HallInput) =>
    (await api<{ hall: Hall }>(`/api/venues/${venueId}/halls`, { method: "POST", body: input })).hall,
  updateHall: async (venueId: string, hallId: string, input: Partial<HallInput>) =>
    (await api<{ hall: Hall }>(`/api/venues/${venueId}/halls/${hallId}`, { method: "PUT", body: input })).hall,
  deleteHall: (venueId: string, hallId: string) =>
    api<{ success: boolean }>(`/api/venues/${venueId}/halls/${hallId}`, { method: "DELETE" }),
  createBlock: (venueId: string, hallId: string, input: { startTime: string; endTime: string; reason?: string }) =>
    api<{ block: { id: string } }>(`/api/venues/${venueId}/halls/${hallId}/blocks`, { method: "POST", body: input }),
  deleteBlock: (venueId: string, hallId: string, blockId: string) =>
    api<{ success: boolean }>(`/api/venues/${venueId}/halls/${hallId}/blocks/${blockId}`, { method: "DELETE" }),
};

export interface VenueInput {
  name: string;
  area: string;
  type: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  policies?: string;
  amenities?: string[];
}

export interface HallInput {
  name: string;
  capacity: number;
  setting: HallSetting;
  notes?: string;
}

/* ---------------- Bookings ---------------- */

export const bookingApi = {
  list: () => api<Booking[]>("/api/bookings"),
  get: (id: string) => api<Booking>(`/api/bookings/${id}`),
  create: (input: {
    venueId: string;
    hallIds: string[];
    startTime: string;
    endTime: string;
    guestCount: number;
    notes?: string;
  }) => api<Booking>("/api/bookings", { method: "POST", body: input }),
  cancel: (id: string, reason?: string) =>
    api<Booking>(`/api/bookings/${id}/cancel`, { method: "POST", body: { reason } }),
  confirm: (id: string) => api<Booking>(`/api/bookings/${id}/confirm`, { method: "POST" }),
};

/* ---------------- Chats (inquiries) ---------------- */

export const chatApi = {
  list: () => api<Conversation[]>("/api/inquiries"),
  get: (id: string) => api<{ conversation: Conversation; messages: Message[] }>(`/api/inquiries/${id}`),
  start: (venueId: string, initialMessage: string) =>
    api<Conversation>("/api/inquiries", { method: "POST", body: { venueId, initialMessage } }),
  send: (id: string, content: string) =>
    api<Message>(`/api/inquiries/${id}/messages`, { method: "POST", body: { content } }),
};

/* ---------------- Vendors ---------------- */

export interface VendorInput {
  name: string;
  category: string;
  description?: string | null;
  priceRange?: string | null;
  phone?: string | null;
  email?: string | null;
  area?: string | null;
}

export const vendorApi = {
  list: async (params: { category?: string } = {}) =>
    (await api<{ vendors: Vendor[] }>(`/api/vendors${q(params)}`)).vendors,
  get: async (id: string) => (await api<{ vendor: Vendor }>(`/api/vendors/${id}`)).vendor,
  mine: async () => (await api<{ vendors: Vendor[] }>("/api/vendors?mine=true")).vendors,
  create: async (input: VendorInput) =>
    (await api<{ vendor: Vendor }>("/api/vendors", { method: "POST", body: input })).vendor,
  update: async (id: string, input: Partial<VendorInput>) =>
    (await api<{ vendor: Vendor }>(`/api/vendors/${id}`, { method: "PATCH", body: input })).vendor,
};

/* ---------------- Support ---------------- */

export const supportApi = {
  create: async (input: { category: string; subject: string; message: string }) =>
    (await api<{ ticket: SupportTicket }>("/api/support/tickets", { method: "POST", body: input })).ticket,
};
