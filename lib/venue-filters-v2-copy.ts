import type { Locale } from "./i18n";

/**
 * Labels for the ?filters=v2 venue filters and card. Kept out of lib/i18n.ts so
 * the existing dictionaries stay untouched. Amharic falls back to English for
 * now; add translations to `am` when they are ready.
 */
const en = {
  fVenueType: "Venue type", fLocation: "Location", fIncludeNearby: "Include nearby areas", fDate: "Date availability",
  fGuests: "Guest capacity", fPrice: "Price range", fSetting: "Setting", fAmenities: "Amenities", fQuick: "Quick filters",
  fSort: "Sort by", fView: "Results view", fSheetTitle: "Filter venues", fNoNearby: "Pick a location to include nearby areas.",
  viewList: "List", viewImages: "Images", viewMap: "Map",
  "setting.indoor": "Indoor", "setting.covered-outdoor": "Covered outdoor", "setting.uncovered-outdoor": "Uncovered outdoor",
  "amenity.catering": "Catering", "amenity.bar": "Bar", "amenity.cleanup": "Clean-up", "amenity.planner": "Event planner",
  "amenity.rentals": "Rentals", "amenity.get-ready-rooms": "Get-ready rooms", "amenity.outside-vendors-allowed": "Outside vendors allowed",
  "amenity.wifi": "Wi-Fi", "amenity.parking": "Parking", "amenity.backup-generator": "Backup generator",
  "quick.responds": "Responds within 24 hours", "quick.popular": "Popular", "quick.recommended": "Recommended",
  "sort.recommended": "Recommended first", "sort.priceLow": "Price: low to high", "sort.priceHigh": "Price: high to low",
  "sort.capacityHigh": "Capacity: high to low", "sort.capacityLow": "Capacity: low to high", "sort.name": "Name: A to Z",
  badgeResponds: "Responds within 24 hours", badgeFeatured: "Featured", checkAvailability: "Check availability",
  photoPlural: "photos", upTo: "Up to",
  mapNote: "Venues grouped by area. This is a layout preview, not an interactive map.",
} as const;

export type V2CopyKey = keyof typeof en;
const am: Partial<Record<V2CopyKey, string>> = {};
const copy: Record<Locale, Partial<Record<V2CopyKey, string>>> = { en, am };

/** v2 label for the locale; falls back to English. */
export function tv2(key: V2CopyKey, locale: Locale): string {
  return copy[locale][key] ?? en[key];
}
