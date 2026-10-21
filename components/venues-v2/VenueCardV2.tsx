"use client";

import { Camera, Clock3, MapPin, Users } from "lucide-react";
import { Link } from "@/lib/nav";
import type { Venue } from "@/lib/mock-data";
import { useDemo } from "@/lib/store";
import { formatETB, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { venueImage } from "@/lib/images";
import { venueTypeLabel } from "@/lib/venues";
import { FEATURED_BADGE_ACTIVE, photoCountOf } from "@/lib/venue-discovery-v2";
import { vt } from "@/lib/venue-discovery-v2-copy";
import styles from "./venues-v2.module.css";

/** Venue card for the ?filters=v2 browser. Built on the existing card styles. */
export function VenueCardV2({ venue }: { venue: Venue }) {
  const { locale } = useDemo();
  const photos = photoCountOf(venue);
  const tags = [
    venueTypeLabel(venue.type, locale),
    ...(venue.setting ? [vt(`setting_${venue.setting}`, locale)] : []),
    ...(venue.amenityKeys ?? []).slice(0, 2).map((key) => vt(`amenity_${key}`, locale)),
  ];
  const showFeatured = FEATURED_BADGE_ACTIVE && venue.featured;
  return <article className="venue-card card">
    <Link href={`/venues/${venue.id}`} className="venue-image-link" aria-label={`${t("viewDetails", locale)}: ${venue.name}`}>
      <img className="venue-image" src={venueImage(venue)} alt={`${venue.name}, ${venue.area}`} loading="lazy" />
      <span className="photo-chip"><Camera size={13} aria-hidden="true" />{formatNumber(photos, locale)} {vt(photos === 1 ? "photoOne" : "photoMany", locale)}</span>
    </Link>
    <div className="venue-card-body">
      {(showFeatured || venue.respondsWithin24h) && <div className={styles.badgeRow}>
        {showFeatured && <span className={`badge ${styles.featured}`}>{vt("badgeFeatured", locale)}</span>}
        {venue.respondsWithin24h && <span className="badge status-positive"><Clock3 size={13} aria-hidden="true" />{vt("badgeResponds", locale)}</span>}
      </div>}
      <h2><Link href={`/venues/${venue.id}`}>{venue.name}</Link></h2>
      <p className={styles.areaLine}><MapPin size={14} aria-hidden="true" />{venue.area}</p>
      <p className="muted line-clamp-2">{venue.description}</p>
      <div className={`tag-list ${styles.cardTags}`}>{tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
      <div className="venue-facts">
        <span><Users size={15} aria-hidden="true" />{vt("upToGuests", locale)} {formatNumber(venue.capacity, locale)} {t("guests", locale)}</span>
        <span>{t("startingAt", locale)} <strong>{formatETB(venue.price, locale)}</strong></span>
      </div>
      <Link className={`btn btn-primary full-width ${styles.cardActions}`} href={`/venues/${venue.id}`}>{vt("checkAvailability", locale)}</Link>
    </div>
  </article>;
}
