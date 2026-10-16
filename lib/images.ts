/**
 * Single source of truth for imagery.
 *
 * Every venue, vendor and landing image in the app resolves through this
 * module, so the placeholders can be swapped for real Vortex venue photos
 * without touching a component:
 *
 *   1. drop the real files into public/images/
 *   2. update the path maps below
 *
 * Keeping the existing filenames means step 2 can be skipped entirely.
 *
 * The current files are neutral SVG placeholders generated locally: no
 * hotlinked third-party assets and no attribution obligations. Each one is
 * labelled with the venue type or vendor category it stands in for, so it reads
 * as an intentional placeholder in a demo rather than as a broken image.
 */

/** Venue type (as stored on `Venue.type`) → image path. */
export const VENUE_TYPE_IMAGES: Record<string, string> = {
  "Wedding hall": "/images/venue-wedding-hall.svg",
  "Garden venue": "/images/venue-garden.svg",
  "Conference space": "/images/venue-conference.svg",
  "Hotel ballroom": "/images/venue-ballroom.svg",
};
export const FALLBACK_VENUE_IMAGE = "/images/venue-generic.svg";

/** Vendor category (as stored on `Vendor.category`) → portfolio image paths. */
export const VENDOR_CATEGORY_IMAGES: Record<string, string[]> = {
  Photography: ["/images/vendor-photography-1.svg", "/images/vendor-photography-2.svg", "/images/vendor-photography-3.svg"],
  Catering: ["/images/vendor-catering-1.svg", "/images/vendor-catering-2.svg", "/images/vendor-catering-3.svg"],
  Decor: ["/images/vendor-decor-1.svg", "/images/vendor-decor-2.svg", "/images/vendor-decor-3.svg"],
  "Music & sound": ["/images/vendor-music-sound-1.svg", "/images/vendor-music-sound-2.svg", "/images/vendor-music-sound-3.svg"],
  Beauty: ["/images/vendor-beauty-1.svg", "/images/vendor-beauty-2.svg", "/images/vendor-beauty-3.svg"],
};
export const FALLBACK_VENDOR_IMAGES = ["/images/vendor-generic-1.svg", "/images/vendor-generic-2.svg", "/images/vendor-generic-3.svg"];

/** Intended supplied hero asset. The landing components fall back locally if it is unavailable. */
export const LANDING_HERO_IMAGE = "/images/addis-wedding-stage-hero.jpg";
export const FALLBACK_LANDING_HERO_IMAGE = "/images/venue-garden.svg";

type VenueLike = { type?: string; photos?: string[] } | undefined | null;

/**
 * A venue's own uploaded photo when it has one, otherwise the placeholder for
 * its type. Admin-uploaded `photos` always win, so real images take over
 * per-venue without changing this module.
 */
export function venueImage(venue: VenueLike): string {
  const uploaded = venue?.photos?.[0];
  if (uploaded) return uploaded;
  return VENUE_TYPE_IMAGES[venue?.type ?? ""] ?? FALLBACK_VENUE_IMAGE;
}

/** The primary portfolio image for a vendor category. */
export function vendorImage(category: string | undefined | null): string {
  return vendorGallery(category)[0];
}

/** Portfolio images for a vendor category (used by the profile gallery). */
export function vendorGallery(category: string | undefined | null): string[] {
  return VENDOR_CATEGORY_IMAGES[category ?? ""] ?? FALLBACK_VENDOR_IMAGES;
}
