"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialMockState, mockAdminStaff, vendorCategories, type AdminStaff, type AdminStaffRole, type Booking, type BookingStatus, type Customer, type FeeStatement, type Inquiry, type InquiryStatus, type Payment, type PaymentStatus, type Venue, type Vendor } from "./mock-data";
import type { Locale } from "./i18n";

type DemoRole = "customer" | "vendor" | "admin";
type StaffRole = AdminStaffRole;
export type AuditRecord = { id: string; at: string; actor: string; action: string; details: string };
export type DemoData = {
  bookings: Booking[]; inquiries: Inquiry[]; payments: Payment[]; fees: FeeStatement[]; savedVendors: string[]; savedVenues: string[];
  venues: Venue[]; vendors: Vendor[]; customers: Customer[]; staffAccounts: AdminStaff[]; auditLog: AuditRecord[]; categories: string[];
  commissionMode: "percentage" | "fixed"; commissionValue: number; venueCommissionOverrides: Record<string, number>;
  leadFeesByCategory: Record<string, number>; staticContent: Record<string, string>; notificationPreferences: Record<string, boolean>;
  locale: Locale; role: DemoRole; staffRole: StaffRole; previewVendorId: string; paymentOutcome: "success" | "failure" | "pending";
  contactVenueAfterDeposit: boolean; contactVendorAfterAcceptance: boolean;
  feeTiming: "inquiry sent" | "vendor confirms" | "admin confirms";
};

type DemoContextValue = DemoData & {
  setRole: (role: DemoRole) => void; setStaffRole: (role: StaffRole) => void; setLocale: (locale: Locale) => void; setPreviewVendorId: (vendorId: string) => void;
  setPaymentOutcome: (value: DemoData["paymentOutcome"]) => void; setFeeTiming: (value: DemoData["feeTiming"]) => void;
  setContactRules: (venue: boolean, vendor: boolean) => void;
  createBooking: (input: Omit<Booking, "id" | "status" | "createdAt" | "source"> & { source?: Booking["source"] }) => Booking;
  updateBooking: (booking: Booking) => void;
  simulatePayment: (bookingId: string) => { outcome: DemoData["paymentOutcome"]; payment: Payment; booking: Booking | undefined };
  setBookingStatus: (id: string, status: BookingStatus) => void; rescheduleBooking: (id: string, date: string) => void;
  createInquiry: (input: Omit<Inquiry, "id" | "status">) => Inquiry; setInquiryStatus: (id: string, status: InquiryStatus, response?: string, actor?: "vendor" | "admin") => void;
  toggleSaved: (vendorId: string) => void; toggleSavedVenue: (venueId: string) => void; recordRefund: (paymentId: string) => void;
  saveVenue: (venue: Venue) => void; saveVendor: (vendor: Vendor) => void; removeVendor: (vendorId: string) => void; saveCustomer: (customer: Customer) => void;
  saveStaffAccount: (account: AdminStaff) => void; setFeeRecord: (id: string, status: FeeStatement["status"], amount?: number) => void;
  saveRevenueModel: (mode: DemoData["commissionMode"], value: number, overrides: Record<string, number>, leadFees: Record<string, number>) => void;
  saveCategories: (categories: string[]) => void; saveStaticContent: (content: Record<string, string>) => void;
  saveNotificationPreferences: (preferences: Record<string, boolean>) => void; addAuditRecord: (action: string, details: string) => void;
  isDateHeld: (venueId: string, date: string, exceptId?: string) => boolean;
  conflictsFor: (booking: Booking) => Booking[];
};

const defaults: DemoData = {
  bookings: initialMockState.bookings, inquiries: initialMockState.inquiries, payments: initialMockState.payments,
  venues: initialMockState.venues, vendors: initialMockState.vendors, customers: initialMockState.customers, staffAccounts: mockAdminStaff, auditLog: [], categories: [...vendorCategories],
  commissionMode: "percentage", commissionValue: 10, venueCommissionOverrides: {}, leadFeesByCategory: Object.fromEntries(vendorCategories.map((category) => [category, 1000])),
  staticContent: { faq_en: "Frequently asked questions for Addis Gathering.", faq_am: "ተደጋጋሚ ጥያቄዎች።", terms_en: "Sample terms of service.", terms_am: "የአገልግሎት ውሎች ማሳያ።", privacy_en: "Sample privacy notice.", privacy_am: "የግላዊነት ማስታወቂያ ማሳያ።" },
  notificationPreferences: { booking: true, inquiry: true, payment: true, vendor: true },
  fees: initialMockState.fees, savedVendors: initialMockState.savedVendors, savedVenues: [], locale: "en", role: "customer", previewVendorId: "vendor-1",
  staffRole: "Super Admin", paymentOutcome: "success", contactVenueAfterDeposit: true,
  contactVendorAfterAcceptance: true, feeTiming: "vendor confirms",
};
const Context = createContext<DemoContextValue | null>(null);
const storageKey = "addis-gathering-demo-v1";

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DemoData>;
        setData({ ...defaults, ...parsed });
      }
    } catch { /* Invalid browser sample state starts clean. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, ready]);

  const value = useMemo<DemoContextValue>(() => ({
    ...data,
    setRole: (role) => setData((s) => ({ ...s, role })),
    setStaffRole: (staffRole) => setData((s) => ({ ...s, staffRole })),
    setLocale: (locale) => setData((s) => ({ ...s, locale })),
    setPreviewVendorId: (previewVendorId) => setData((s) => ({ ...s, previewVendorId })),
    setPaymentOutcome: (paymentOutcome) => setData((s) => ({ ...s, paymentOutcome })),
    setFeeTiming: (feeTiming) => setData((s) => ({ ...s, feeTiming })),
    setContactRules: (contactVenueAfterDeposit, contactVendorAfterAcceptance) => setData((s) => ({ ...s, contactVenueAfterDeposit, contactVendorAfterAcceptance })),
    createBooking: (input) => {
      const booking: Booking = { ...input, id: `BK-${Date.now()}`, status: "Requested", createdAt: new Date().toISOString().slice(0, 10), source: input.source || "Platform" };
      setData((s) => ({ ...s, bookings: [booking, ...s.bookings] }));
      return booking;
    },
    updateBooking: (booking) => setData((s) => ({ ...s, bookings: s.bookings.some((item) => item.id === booking.id) ? s.bookings.map((item) => item.id === booking.id ? booking : item) : [booking, ...s.bookings] })),
    simulatePayment: (bookingId) => {
      const current = data.bookings.find((booking) => booking.id === bookingId);
      if (!current) return { outcome: data.paymentOutcome, payment: { id: `PAY-${Date.now()}`, bookingId, amount: 0, status: "Failure", date: new Date().toISOString().slice(0, 10), kind: "Deposit" }, booking: undefined };
      const status: PaymentStatus = data.paymentOutcome === "success" ? "Success" : data.paymentOutcome === "failure" ? "Failure" : "Pending";
      const updated: Booking = data.paymentOutcome === "success" ? { ...current, status: "Reserved" } : { ...current, status: "Requested" };
      const payment: Payment = { id: `PAY-${Date.now()}`, bookingId, amount: current.deposit, status, date: new Date().toISOString().slice(0, 10), kind: "Deposit" };
      setData((s) => ({ ...s, bookings: s.bookings.map((booking) => booking.id === bookingId ? updated : booking), payments: [payment, ...s.payments] }));
      return { outcome: data.paymentOutcome, payment, booking: updated };
    },
    setBookingStatus: (id, status) => setData((s) => ({ ...s, bookings: s.bookings.map((booking) => booking.id === id ? { ...booking, status } : booking) })),
    rescheduleBooking: (id, eventDate) => setData((s) => ({ ...s, bookings: s.bookings.map((booking) => booking.id === id ? { ...booking, eventDate, status: "Requested" } : booking) })),
    createInquiry: (input) => {
      const inquiry: Inquiry = { ...input, id: `IN-${Date.now()}-${Math.floor(Math.random() * 1000)}`, status: "New" };
      const category = data.vendors.find((vendor) => vendor.id === input.vendorId)?.category || "";
      const fee: FeeStatement | undefined = data.feeTiming === "inquiry sent" ? { id: `FEE-${Date.now()}-${Math.floor(Math.random() * 1000)}`, vendorId: input.vendorId, inquiryId: inquiry.id, amount: data.leadFeesByCategory[category] ?? 1000, status: "Outstanding", date: new Date().toISOString().slice(0, 10) } : undefined;
      setData((s) => ({ ...s, inquiries: [inquiry, ...s.inquiries], fees: fee ? [fee, ...s.fees] : s.fees }));
      return inquiry;
    },
    setInquiryStatus: (id, status, response, actor = "vendor") => setData((s) => {
      const inquiry = s.inquiries.find((item) => item.id === id);
      const timingMatches = (s.feeTiming === "vendor confirms" && actor === "vendor") || (s.feeTiming === "admin confirms" && actor === "admin");
      const shouldCreateFee = status === "Confirmed" && timingMatches && inquiry && !s.fees.some((fee) => fee.inquiryId === id);
      const category = inquiry ? s.vendors.find((vendor) => vendor.id === inquiry.vendorId)?.category || "" : "";
      const fee: FeeStatement | undefined = shouldCreateFee ? { id: `FEE-${Date.now()}`, vendorId: inquiry.vendorId, inquiryId: id, amount: s.leadFeesByCategory[category] ?? 1000, status: "Outstanding", date: new Date().toISOString().slice(0, 10) } : undefined;
      return { ...s, inquiries: s.inquiries.map((item) => item.id === id ? { ...item, status, ...(response ? { response } : {}) } : item), fees: fee ? [fee, ...s.fees] : s.fees };
    }),
    toggleSaved: (vendorId) => setData((s) => ({ ...s, savedVendors: s.savedVendors.includes(vendorId) ? s.savedVendors.filter((id) => id !== vendorId) : [vendorId, ...s.savedVendors] })),
    toggleSavedVenue: (venueId) => setData((s) => ({ ...s, savedVenues: (s.savedVenues ?? []).includes(venueId) ? s.savedVenues.filter((id) => id !== venueId) : [venueId, ...(s.savedVenues ?? [])] })),
    recordRefund: (paymentId) => setData((s) => { const payment = s.payments.find((item) => item.id === paymentId); if (!payment || payment.status === "Refunded") return s; const record: AuditRecord = { id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditRefundRecorded", details: `${payment.id} · ETB ${payment.amount}` }; return { ...s, payments: s.payments.map((item) => item.id === paymentId ? { ...item, status: "Refunded", kind: "Refund" } : item), auditLog: [record, ...s.auditLog] }; }),
    saveVenue: (venue) => setData((s) => ({ ...s, venues: s.venues.some((item) => item.id === venue.id) ? s.venues.map((item) => item.id === venue.id ? venue : item) : [venue, ...s.venues], auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditVenueSaved", details: venue.name }, ...s.auditLog] })),
    saveVendor: (vendor) => setData((s) => ({ ...s, vendors: s.vendors.some((item) => item.id === vendor.id) ? s.vendors.map((item) => item.id === vendor.id ? vendor : item) : [vendor, ...s.vendors], auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditVendorUpdated", details: `${vendor.name} · ${vendor.status}` }, ...s.auditLog] })),
    removeVendor: (vendorId) => setData((s) => { const vendor = s.vendors.find((item) => item.id === vendorId); if (!vendor) return s; return { ...s, vendors: s.vendors.filter((item) => item.id !== vendorId), auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditVendorRemoved", details: vendor.name }, ...s.auditLog] }; }),
    saveCustomer: (customer) => setData((s) => { const previous = s.customers.find((item) => item.id === customer.id); const renamed = !!previous && previous.name !== customer.name; return { ...s, customers: s.customers.some((item) => item.id === customer.id) ? s.customers.map((item) => item.id === customer.id ? customer : item) : [customer, ...s.customers], bookings: renamed ? s.bookings.map((item) => item.customer === previous!.name ? { ...item, customer: customer.name } : item) : s.bookings, inquiries: renamed ? s.inquiries.map((item) => item.customer === previous!.name ? { ...item, customer: customer.name } : item) : s.inquiries, auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditCustomerSaved", details: customer.name }, ...s.auditLog] }; }),
    saveStaffAccount: (account) => setData((s) => ({ ...s, staffAccounts: s.staffAccounts.some((item) => item.id === account.id) ? s.staffAccounts.map((item) => item.id === account.id ? account : item) : [account, ...s.staffAccounts], auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditStaffRoleUpdated", details: `${account.name} · ${account.role}` }, ...s.auditLog] })),
    setFeeRecord: (id, status, amount) => setData((s) => { const fee = s.fees.find((item) => item.id === id); if (!fee) return s; const updated = { ...fee, status, ...(amount !== undefined ? { amount } : {}) }; const record: AuditRecord = { id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: status === "Waived" ? "auditFeeWaived" : amount !== undefined && amount !== fee.amount ? "auditFeeAdjusted" : "auditFeeStatusUpdated", details: `${id} · ${status}${amount !== undefined ? ` · ETB ${amount}` : ""}` }; return { ...s, fees: s.fees.map((item) => item.id === id ? updated : item), auditLog: [record, ...s.auditLog] }; }),
    saveRevenueModel: (commissionMode, commissionValue, venueCommissionOverrides, leadFeesByCategory) => setData((s) => ({ ...s, commissionMode, commissionValue, venueCommissionOverrides, leadFeesByCategory, auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditRevenueModelUpdated", details: `${commissionMode} · ${commissionValue}` }, ...s.auditLog] })),
    saveCategories: (categories) => setData((s) => ({ ...s, categories, auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditCategoriesUpdated", details: categories.join(", ") }, ...s.auditLog] })),
    saveStaticContent: (staticContent) => setData((s) => ({ ...s, staticContent, auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditStaticContentUpdated", details: "FAQ, Terms, Privacy" }, ...s.auditLog] })),
    saveNotificationPreferences: (notificationPreferences) => setData((s) => ({ ...s, notificationPreferences, auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action: "auditNotificationSettingsUpdated", details: "Preference changes" }, ...s.auditLog] })),
    addAuditRecord: (action, details) => setData((s) => ({ ...s, auditLog: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), actor: s.staffRole, action, details }, ...s.auditLog] })),
    isDateHeld: (venueId, date, exceptId) => data.bookings.some((booking) => booking.id !== exceptId && booking.venueId === venueId && booking.eventDate === date && (booking.status === "Reserved" || booking.status === "Confirmed")),
    conflictsFor: (booking) => data.bookings.filter((item) => item.id !== booking.id && item.venueId === booking.venueId && item.eventDate === booking.eventDate && item.status === "Requested" && data.bookings.some((held) => held.venueId === item.venueId && held.eventDate === item.eventDate && (held.status === "Reserved" || held.status === "Confirmed"))),
  }), [data]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
