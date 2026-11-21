"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useDemo } from "@/lib/store";
import { useSession } from "@/components/SessionProvider";

export function DataHydrator() {
  const pathname = usePathname();
  const { hydrateFromServer, hydrateCatalogFromServer } = useDemo();
  const { status: sessionStatus, account } = useSession();

  const customerOnly = [
    "/my-event",
    "/my-bookings",
    "/my-inquiries",
    "/my-payments",
    "/saved",
    "/profile",
    "/settings",
    "/payments",
    "/inquiries",
    "/bookings",
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    // Always synchronize live database catalog (venues & vendors) from PostgreSQL
    Promise.all([fetch("/api/venues"), fetch("/api/vendors?limit=100")])
      .then(async ([venueResponse, vendorResponse]) => {
        const venueData = venueResponse.ok ? await venueResponse.json() : { venues: [] };
        const vendorData = vendorResponse.ok ? await vendorResponse.json() : { vendors: [] };
        hydrateCatalogFromServer({
          venues: venueData.venues || [],
          vendors: vendorData.vendors || [],
        });
      })
      .catch(() => hydrateCatalogFromServer({ venues: [], vendors: [] }));

    if (customerOnly && sessionStatus === "authenticated" && account) {
      Promise.all([fetch("/api/venues"), fetch("/api/bookings")])
        .then(async ([venueResponse, bookingResponse]) => {
          const venueData = venueResponse.ok ? await venueResponse.json() : { venues: [] };
          const bookings = bookingResponse.ok ? await bookingResponse.json() : [];
          hydrateFromServer({
            account,
            venues: venueData.venues || [],
            bookings: Array.isArray(bookings) ? bookings : [],
          });
        })
        .catch(() => {});
    }
  }, [customerOnly, sessionStatus, account, hydrateFromServer, hydrateCatalogFromServer]);

  return null;
}
