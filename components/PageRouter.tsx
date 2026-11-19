"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { LandingPage } from "@/components/LandingPage";
import { BookingRequestForm, BookingSubmitted, MyEventDashboard, PaymentScreen, VenueBrowser, VenueDetails } from "@/components/CoreFlow";
import { VenueBrowserGate } from "@/components/venues-v2/VenueBrowserGates";
import { CustomerInquiries, CustomerInquiryDetail, CustomerVendorBrowser, InquiryRequest, InquirySent, VendorFeeStatementDetail, VendorFeeStatements, VendorHome, VendorInquiryDetail, VendorInquiries, VendorProfile, VendorSignInPreview } from "@/components/VendorFlow";
import { AdminWorkspace } from "@/components/AdminTools";
import { ContactPage, CustomerBookingDetail, CustomerBookings, CustomerNotifications, CustomerPayments, CustomerProfileSetup, CustomerSavedVendors, CustomerSettings, CustomerSignIn, StaticCustomerPage } from "@/components/CustomerExtras";
import { VendorApplicationForm, VendorApplicationStatus, VendorListingEditor, VendorListingPreview, VendorNotifications, VendorSettings } from "@/components/VendorExtras";

export function PageRouter() {
  const pathname = usePathname();
  const { role, locale, hydrateFromServer, hydrateCatalogFromServer } = useDemo();
  const pieces = pathname.split("/").filter(Boolean);
  const customerOnly = ["/my-event", "/my-bookings", "/my-inquiries", "/my-payments", "/saved", "/profile", "/settings", "/payments", "/inquiries", "/bookings"].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  useEffect(() => {
    // Always synchronize live database catalog (venues & vendors) from PostgreSQL
    Promise.all([fetch("/api/venues"), fetch("/api/vendors?limit=100")])
      .then(async ([venueResponse, vendorResponse]) => {
        const venueData = venueResponse.ok ? await venueResponse.json() : { venues: [] };
        const vendorData = vendorResponse.ok ? await vendorResponse.json() : { vendors: [] };
        hydrateCatalogFromServer({ venues: venueData.venues || [], vendors: vendorData.vendors || [] });
      })
      .catch(() => hydrateCatalogFromServer({ venues: [], vendors: [] }));

    if (!customerOnly) {
      setAuthState("authenticated");
      return;
    }
    fetch("/api/auth/me").then(async (response) => {
      if (!response.ok) { setAuthState("unauthenticated"); return; }
      const account = await response.json();
      if (account.status !== "authenticated" || !account.account) { setAuthState("unauthenticated"); return; }
      setAuthState("authenticated");
      const [venueResponse, bookingResponse] = await Promise.all([fetch("/api/venues"), fetch("/api/bookings")]);
      const venueData = venueResponse.ok ? await venueResponse.json() : { venues: [] };
      const bookings = bookingResponse.ok ? await bookingResponse.json() : [];
      hydrateFromServer({ account: account.account, venues: venueData.venues || [], bookings: Array.isArray(bookings) ? bookings : [] });
    }).catch(() => setAuthState("unauthenticated"));
  // hydrateFromServer is recreated with store updates; this gate should run only when the route changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerOnly]);
  if (customerOnly && authState === "checking") return <section className="card"><h1>Connecting your account…</h1><p>Loading your backend account and customer data.</p></section>;
  if (customerOnly && authState === "unauthenticated") return <section className="card access-denied"><LockKeyhole size={27} aria-hidden="true" /><h1>Sign in required</h1><p>Sign in to view your bookings, inquiries, payments, and profile.</p><Link className="btn btn-primary" href="/login">Sign in <ArrowRight size={16} aria-hidden="true" /></Link></section>;
  const forbidden = (pathname.startsWith("/admin") && role !== "admin" && pathname !== "/admin/login") || (pathname.startsWith("/vendor") && role !== "vendor" && pathname !== "/vendor/sign-in" && pathname !== "/vendor/apply") || (customerOnly && role !== "customer");
  if (forbidden) return <section className="card access-denied"><LockKeyhole size={27} aria-hidden="true" /><h1>{t("accessDenied", locale)}</h1><p>You do not have permission to view this page.</p><Link className="btn btn-primary" href="/">{t("backHome", locale)} <ArrowRight size={16} aria-hidden="true" /></Link></section>;
  if (pathname === "/") return <LandingPage />;
  if (pathname === "/vendor/sign-in") return <VendorSignInPreview />;
  if (pathname === "/vendor/apply") return <VendorApplicationForm />;
  if (pathname === "/vendor/application") return <VendorApplicationStatus />;
  if (pathname === "/vendor/profile") return <VendorListingEditor />;
  if (pathname === "/vendor/listing-preview") return <VendorListingPreview />;
  if (pathname === "/vendor/notifications") return <VendorNotifications />;
  if (pathname === "/vendor/settings") return <VendorSettings />;
  if (pathname === "/sign-in") return <CustomerSignIn />;
  if (pathname === "/verify-otp") return <CustomerSignIn otp />;
  if (pathname === "/profile/setup") return <CustomerProfileSetup />;
  if (pathname === "/my-bookings") return <CustomerBookings />;
  if (pieces[0] === "my-bookings" && pieces[1]) return <CustomerBookingDetail bookingId={pieces[1]} />;
  if (pathname === "/my-payments") return <CustomerPayments />;
  if (pathname === "/saved") return <CustomerSavedVendors />;
  if (pathname === "/profile" || pathname === "/settings") return <CustomerSettings />;
  if (pathname === "/notifications") return <CustomerNotifications />;
  if (pathname === "/about") return <StaticCustomerPage page="about" />;
  if (pathname === "/faq") return <StaticCustomerPage page="faq" />;
  if (pathname === "/terms") return <StaticCustomerPage page="terms" />;
  if (pathname === "/privacy") return <StaticCustomerPage page="privacy" />;
  if (pathname === "/contact") return <ContactPage />;
  if (pathname === "/venues") return <VenueBrowserGate />;
  if (pieces[0] === "venues" && pieces[1]) return <VenueDetails venueId={pieces[1]} />;
  if (pathname === "/vendors") return <CustomerVendorBrowser />;
  if (pieces[0] === "vendors" && pieces[1]) return <VendorProfile vendorId={pieces[1]} />;
  if (pathname === "/inquiries/new") return <InquiryRequest />;
  if (pathname === "/inquiries/sent") return <InquirySent />;
  if (pathname === "/my-inquiries") return <CustomerInquiries />;
  if (pieces[0] === "my-inquiries" && pieces[1]) return <CustomerInquiryDetail inquiryId={pieces[1]} />;
  if (pathname === "/vendor") return <VendorHome />;
  if (pathname === "/vendor/inquiries") return <VendorInquiries />;
  if (pieces[0] === "vendor" && pieces[1] === "inquiries" && pieces[2]) return <VendorInquiryDetail inquiryId={pieces[2]} />;
  if (pathname === "/vendor/fee-statements") return <VendorFeeStatements />;
  if (pieces[0] === "vendor" && pieces[1] === "fee-statements" && pieces[2]) return <VendorFeeStatementDetail statementId={pieces[2]} />;
  if (pathname === "/bookings/new") return <BookingRequestForm />;
  if (pathname === "/bookings/submitted") return <BookingSubmitted />;
  if (pieces[0] === "bookings" && pieces[1]) return <CustomerBookingDetail bookingId={pieces[1]} />;
  if (pathname === "/payments/deposit") return <PaymentScreen />;
  if (["/payments/success", "/payments/failed", "/payments/receipt"].includes(pathname)) return <PaymentScreen receiptOnly />;
  if (pathname === "/my-event") return <MyEventDashboard />;
  if (pathname.startsWith("/admin")) return <AdminWorkspace pathname={pathname} />;
  return <section className="card not-found"><p className="eyebrow">404</p><h1>{t("pageNotFound", locale)}</h1><p>{t("notFoundDescription", locale)}</p><Link className="btn btn-primary" href="/">{t("backHome", locale)}</Link></section>;
}
