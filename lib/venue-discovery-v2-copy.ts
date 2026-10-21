import { t, type Locale } from "./i18n";

/**
 * Copy for the ?filters=v2 venue filters and card. Kept out of lib/i18n.ts so
 * the existing dictionaries are untouched. Keys that already exist in i18n
 * (filters, clearFilters, startingAt, guests...) are read from there.
 */
const en: Record<string, string> = {
  fVenueType: "Venue type", fLocation: "Location", fIncludeNearby: "Include nearby areas", fDate: "Date availability",
  fGuests: "Guest capacity", fPrice: "Price range", fSetting: "Setting", fAmenities: "Amenities", fQuick: "Quick filters",
  fSort: "Sort by", fView: "Results view", fFiltersHeading: "Filter venues",
  viewList: "List", viewImages: "Images", viewMap: "Map",
  "setting_indoor": "Indoor", "setting_covered-outdoor": "Covered outdoor", "setting_uncovered-outdoor": "Uncovered outdoor",
  amenity_catering: "Catering", amenity_bar: "Bar", amenity_cleanup: "Clean-up", amenity_planner: "Event planner",
  amenity_rentals: "Rentals", amenity_getReady: "Get-ready rooms", amenity_outsideVendors: "Outside vendors allowed",
  amenity_wifi: "Wi-Fi", amenity_parking: "Parking", amenity_generator: "Backup generator",
  quickResponds: "Responds within 24 hours", quickPopular: "Popular", quickRecommended: "Recommended",
  sort_best: "Best match", sort_priceLow: "Price: low to high", sort_priceHigh: "Price: high to low",
  sort_capacityHigh: "Capacity: largest first", sort_capacityLow: "Capacity: smallest first", sort_name: "Name: A to Z",
  badgeResponds: "Responds within 24 hours", badgeFeatured: "Featured", checkAvailability: "Check availability",
  photoOne: "photo", photoMany: "photos", upToGuests: "Up to", mapNote: "Map preview of the matching venues. Pins are illustrative in this demo.",
  noNearby: "Pick an area to use this",
};
const am: Record<string, string> = {
  fVenueType: "የቦታ አይነት", fLocation: "አካባቢ", fIncludeNearby: "በአቅራቢያ ያሉ አካባቢዎችን አካትት", fDate: "የቀን ተገኝነት",
  fGuests: "የእንግዶች አቅም", fPrice: "የዋጋ ክልል", fSetting: "አቀማመጥ", fAmenities: "አገልግሎቶች", fQuick: "ፈጣን ማጣሪያዎች",
  fSort: "ደርድር", fView: "የውጤት እይታ", fFiltersHeading: "ቦታዎችን አጣራ",
  viewList: "ዝርዝር", viewImages: "ምስሎች", viewMap: "ካርታ",
  "setting_indoor": "ቤት ውስጥ", "setting_covered-outdoor": "የተሸፈነ ክፍት ቦታ", "setting_uncovered-outdoor": "ያልተሸፈነ ክፍት ቦታ",
  amenity_catering: "ምግብ አቅራቢ", amenity_bar: "መጠጥ ቤት", amenity_cleanup: "ጽዳት", amenity_planner: "የዝግጅት አቀናባሪ",
  amenity_rentals: "ኪራይ", amenity_getReady: "የመዘጋጃ ክፍሎች", amenity_outsideVendors: "የውጭ አቅራቢዎች ይፈቀዳሉ",
  amenity_wifi: "ዋይፋይ", amenity_parking: "የመኪና ማቆሚያ", amenity_generator: "ተጠባባቂ ጄኔሬተር",
  quickResponds: "በ24 ሰዓት ውስጥ ምላሽ ይሰጣል", quickPopular: "ተወዳጅ", quickRecommended: "የሚመከር",
  sort_best: "ምርጥ ተዛማጅ", sort_priceLow: "ዋጋ: ከዝቅተኛ ወደ ከፍተኛ", sort_priceHigh: "ዋጋ: ከከፍተኛ ወደ ዝቅተኛ",
  sort_capacityHigh: "አቅም: ትልቁ መጀመሪያ", sort_capacityLow: "አቅም: ትንሹ መጀመሪያ", sort_name: "ስም: ሀ እስከ ፐ",
  badgeResponds: "በ24 ሰዓት ውስጥ ምላሽ ይሰጣል", badgeFeatured: "ተመራጭ", checkAvailability: "ተገኝነትን ተመልከት",
  photoOne: "ፎቶ", photoMany: "ፎቶዎች", upToGuests: "እስከ", mapNote: "የተዛማጅ ቦታዎች የካርታ ቅድመ እይታ። በዚህ ማሳያ ውስጥ ምልክቶቹ ለምሳሌ ናቸው።",
  noNearby: "ለመጠቀም አካባቢ ይምረጡ",
};
const copy: Record<Locale, Record<string, string>> = { en, am };

/** v2 copy first, then the shared dictionary, then the key itself. */
export function vt(key: string, locale: Locale): string {
  return copy[locale][key] ?? copy.en[key] ?? t(key, locale);
}
