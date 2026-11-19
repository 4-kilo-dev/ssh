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
  setting?: "indoor" | "covered-outdoor" | "uncovered-outdoor"; amenityTags?: string[]; guestBuckets?: string[]; respondsWithin24h?: boolean; popular?: boolean; recommended?: boolean; featured?: boolean; photoCount?: number;
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

export const mockVenues: Venue[] = [];
export const vendorCategories = [
  "Photography",
  "Catering",
  "Decor & Stage",
  "Traditional Attire",
  "Sound & DJ",
  "Cake & Pastry",
  "Beauty",
];
export const mockVendors: Vendor[] = [];
export const mockCustomers: Customer[] = [];
export const mockAdminStaff: AdminStaff[] = [];
export const mockBookings: Booking[] = [];
export const mockInquiries: Inquiry[] = [];
export const mockPayments: Payment[] = [];
export const mockFeeStatements: FeeStatement[] = [];
export const mockNotifications: { id: string; title: string; detail: string; date: string; unread: boolean }[] = [];

export const initialMockState = {
  venues: [] as Venue[],
  vendors: [] as Vendor[],
  customers: [] as Customer[],
  bookings: [] as Booking[],
  inquiries: [] as Inquiry[],
  payments: [] as Payment[],
  fees: [] as FeeStatement[],
  savedVendors: [] as string[],
};
