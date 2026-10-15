"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/lib/nav";
import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";
import { DemoControls } from "@/components/DemoControls";
import { BookingRequestForm, BookingSubmitted, MyEventDashboard, PaymentScreen, VenueDetails } from "@/components/CoreFlow";
import { CustomerInquiries, CustomerInquiryDetail, CustomerVendorBrowser, InquiryRequest, InquirySent, VendorProfile } from "@/components/VendorFlow";
import { ContactPage, CustomerBookingDetail, CustomerBookings, CustomerNotifications, CustomerPayments, CustomerProfileSetup, CustomerSavedVendors, CustomerSettings, CustomerSignIn, StaticCustomerPage } from "@/components/CustomerExtras";
import { TgHome } from "@/components/tg/TgHome";
import { TgSignIn } from "@/components/tg/TgSignIn";
import { TgVenueBrowser } from "@/components/tg/TgVenueBrowser";
import { TgCalendar } from "@/components/tg/TgCalendar";
import { TgStickyAction } from "@/components/tg/TgStickyAction";

/**
 * Router for the Telegram Mini App.
 *
 * Customer screens only. The demo role gate that PageRouter applies on the web
 * is deliberately not applied here: the Mini App is always the customer view,
 * so /tg never shows "Access denied" because /demo was left on another role.
 * Vendor and admin paths have no entry and fall through to not-found, which
 * keeps them unreachable from the Mini App.
 */
export function TgPageRouter() {
  const pathname = usePathname();
  const { locale } = useDemo();
  const search = useSearchParams();

  // "/tg/venues/venue-1" -> "/venues/venue-1"
  const logical = pathname.replace(/^\/tg(?=\/|$)/, "") || "/";
  const pieces = logical.split("/").filter(Boolean);
  const queryKey = search.toString();

  if (logical === "/") return <TgHome />;
  if (logical === "/sign-in") return <TgSignIn />;
  if (logical === "/verify-otp") return <CustomerSignIn otp />;
  if (logical === "/profile/setup") return <CustomerProfileSetup />;

  // key={queryKey} re-applies ?q=/?area=/?type= when arriving from a chip or the home search.
  if (logical === "/venues") return <TgVenueBrowser key={queryKey} />;
  if (pieces[0] === "venues" && pieces[1]) {
    return <VenueDetails venueId={pieces[1]} calendar={(slot) => <TgCalendar {...slot} />} />;
  }

  if (logical === "/vendors") return <CustomerVendorBrowser />;
  if (pieces[0] === "vendors" && pieces[1]) return <VendorProfile vendorId={pieces[1]} />;
  if (logical === "/inquiries/new") return <InquiryRequest />;
  if (logical === "/inquiries/sent") return <InquirySent />;
  if (logical === "/my-inquiries") return <CustomerInquiries />;
  if (pieces[0] === "my-inquiries" && pieces[1]) return <CustomerInquiryDetail inquiryId={pieces[1]} />;

  // Booking and payment screens promote their real primary button to the sticky action.
  if (logical === "/bookings/new") return <><BookingRequestForm /><TgStickyAction /></>;
  if (logical === "/bookings/submitted") return <><BookingSubmitted /><TgStickyAction /></>;
  if (pieces[0] === "bookings" && pieces[1]) return <CustomerBookingDetail bookingId={pieces[1]} />;

  if (logical === "/payments/deposit") return <><PaymentScreen /><TgStickyAction /></>;
  if (["/payments/success", "/payments/failed", "/payments/receipt"].includes(logical)) {
    return <><PaymentScreen receiptOnly /><TgStickyAction /></>;
  }

  if (logical === "/my-event") return <MyEventDashboard />;
  if (logical === "/my-bookings") return <CustomerBookings />;
  if (pieces[0] === "my-bookings" && pieces[1]) return <CustomerBookingDetail bookingId={pieces[1]} />;
  if (logical === "/my-payments") return <CustomerPayments />;
  if (logical === "/saved") return <CustomerSavedVendors />;
  if (logical === "/notifications") return <CustomerNotifications />;
  if (logical === "/profile" || logical === "/settings") return <CustomerSettings />;

  // Payment outcome selector and demo reset — the sales team needs this in /tg.
  if (logical === "/demo") return <DemoControls />;

  if (["/about", "/faq", "/terms", "/privacy"].includes(logical)) {
    return <StaticCustomerPage page={logical.slice(1) as "about" | "faq" | "terms" | "privacy"} />;
  }
  if (logical === "/contact") return <ContactPage />;

  return <section className="card not-found">
    <p className="eyebrow">404</p>
    <h1>{t("pageNotFound", locale)}</h1>
    <p>{t("tgMiniAppOnly", locale)}</p>
    <Link className="btn btn-primary" href="/">{t("backHome", locale)}</Link>
  </section>;
}
