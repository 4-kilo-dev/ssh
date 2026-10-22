"use client";

import { Camera, Clock3, MapPin, Users } from "lucide-react";
import { Link } from "@/lib/nav";
import type { Venue } from "@/lib/mock-data";
import { useDemo } from "@/lib/store";
import { formatETB, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { venueImage } from "@/lib/images";
import { venueTypeLabel } from "@/lib/venues";
import { AMENITY_TAGS, SETTINGS, isFeatured, photoCountOf } from "@/lib/venue-filters-v2";
import { tv2, type V2CopyKey } from "@/lib/venue-filters-v2-copy";
import "./venues-v2.css";

/**
 * Venue card for ?filters=v2. Single photo (no carousel yet), photo count chip
 * only when there is more than one photo, and no reviews, ratings or awards.
 */
export function VenueCardV2({ venue }: { venue: Venue }) {
  const { locale } = useDemo();
  const photos = photoCountOf(venue);
  const setting = SETTINGS.find((item) => item === venue.setting);
  const amenityTags = AMENITY_TAGS.filter((tag) => venue.amenityTags?.includes(tag)).slice(0, 3);
  const tags = [
    venueTypeLabel(venue.type, locale),
    ...(setting ? [tv2(`setting.${setting}` as V2CopyKey, locale)] : []),
    ...amenityTags.map((tag) => tv2(`amenity.${tag}` as V2CopyKey, locale)),
  ];
  const featured = isFeatured(venue);
  const responds = venue.respondsWithin24h === true;
  return <article className="venue-card card">
    <Link href={`/venues/${venue.id}`} className="venue-image-link" aria-label={`${t("viewDetails", locale)}: ${venue.name}`}>
      <img className="venue-image" src={venueImage(venue)} alt={`${venue.area} event venue`} loading="lazy" />
      {photos > 1 && <span className="photo-chip"><Camera size={13} aria-hidden="true" />{formatNumber(photos, locale)} {tv2("photoPlural", locale)}</span>}
    </Link>
    <div className="venue-card-body">
      {(featured || responds) && <div className="v2-card-badges">
        {featured && <span className="badge v2-badge-featured">{tv2("badgeFeatured", locale)}</span>}
        {responds && <span className="badge status-positive"><Clock3 size={13} aria-hidden="true" />{tv2("badgeResponds", locale)}</span>}
      </div>}
      <h2><Link href={`/venues/${venue.id}`}>{venue.name}</Link></h2>
      <p className="v2-card-meta"><MapPin size={14} aria-hidden="true" />{venue.area}</p>
      <p className="muted line-clamp-2">{venue.description}</p>
      <div className="tag-list v2-card-tags">{tags.map((tag, index) => <span className="tag" key={`${tag}-${index}`}>{tag}</span>)}</div>
      <div className="venue-facts">
        <span><Users size={15} aria-hidden="true" />{tv2("upTo", locale)} {formatNumber(venue.capacity, locale)} {t("guests", locale)}</span>
        <span>{t("startingAt", locale)} <strong>{formatETB(venue.price, locale)}</strong></span>
      </div>
      <Link className="btn btn-primary full-width" href={`/venues/${venue.id}`}>{tv2("checkAvailability", locale)}</Link>
    </div>
  </article>;
}
