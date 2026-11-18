/**
 * Image fallbacks, mirroring the website's lib/images.ts: when a venue or
 * vendor has no photos yet, show the site's placeholder for its type or
 * category (served by the backend from /public/images).
 */
import { absoluteUrl } from "@/config";

const VENUE_TYPE_IMAGES: Record<string, string> = {
  "Wedding hall": "/images/venue-wedding-hall.svg",
  "Garden venue": "/images/venue-garden.svg",
  "Conference space": "/images/venue-conference.svg",
  "Hotel ballroom": "/images/venue-ballroom.svg",
};
const FALLBACK_VENUE_IMAGE = "/images/venue-generic.svg";

const VENDOR_CATEGORY_IMAGES: Record<string, string> = {
  Photography: "/images/vendor-photography-1.svg",
  Catering: "/images/vendor-catering-1.svg",
  Decor: "/images/vendor-decor-1.svg",
  "Music & sound": "/images/vendor-music-sound-1.svg",
  Beauty: "/images/vendor-beauty-1.svg",
};
const FALLBACK_VENDOR_IMAGE = "/images/vendor-generic-1.svg";

export const VENUE_TYPES = Object.keys(VENUE_TYPE_IMAGES);

export function venueImages(venue: { photos?: string[] | null; type: string }): string[] {
  const photos = (venue.photos ?? []).filter(Boolean);
  if (photos.length > 0) return photos.map(absoluteUrl);
  return [absoluteUrl(VENUE_TYPE_IMAGES[venue.type] ?? FALLBACK_VENUE_IMAGE)];
}

export function venueCover(venue: { photos?: string[] | null; photo?: string | null; type: string }): string {
  if (venue.photo) return absoluteUrl(venue.photo);
  return venueImages(venue)[0];
}

export function vendorImage(vendor: { category: string }): string {
  return absoluteUrl(VENDOR_CATEGORY_IMAGES[vendor.category] ?? FALLBACK_VENDOR_IMAGE);
}
