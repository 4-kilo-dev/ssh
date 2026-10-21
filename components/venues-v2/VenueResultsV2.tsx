"use client";

import { Camera, Grid2X2, List, MapPin } from "lucide-react";
import { Link } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { Venue } from "@/lib/mock-data";
import { formatETB, formatNumber } from "@/lib/format";
import { venueImage } from "@/lib/images";
import { SORT_KEYS, VIEW_MODES, photoCountOf, type SortKey, type ViewMode } from "@/lib/venue-discovery-v2";
import { vt } from "@/lib/venue-discovery-v2-copy";
import { VenueCardV2 } from "./VenueCardV2";
import styles from "./venues-v2.module.css";

const viewIcons = { list: List, images: Grid2X2, map: MapPin } as const;

/** Sort select and the List / Images / Map switch. */
export function VenueResultsToolbarV2({ locale, idPrefix, count, sort, onSort, view, onView }: {
  locale: Locale; idPrefix: string; count: number; sort: SortKey; onSort: (value: SortKey) => void; view: ViewMode; onView: (value: ViewMode) => void;
}) {
  return <div className="results-toolbar">
    <div>
      <p className="eyebrow">{t("results", locale)}</p>
      <h2 role="status">{formatNumber(count, locale)} <span className="muted">{t("venues", locale)}</span></h2>
    </div>
    <div className={styles.toolbarControls}>
      <div className={styles.sortField}>
        <label htmlFor={`${idPrefix}-sort`}>{vt("fSort", locale)}</label>
        <select id={`${idPrefix}-sort`} className="field" value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
          {SORT_KEYS.map((key) => <option key={key} value={key}>{vt(`sort_${key}`, locale)}</option>)}
        </select>
      </div>
      <div className={styles.viewSwitch} role="group" aria-label={vt("fView", locale)}>
        {VIEW_MODES.map((mode) => {
          const Icon = viewIcons[mode];
          return <button key={mode} type="button" aria-pressed={view === mode} onClick={() => onView(mode)}>
            <Icon size={16} aria-hidden="true" />{vt(`view${mode[0].toUpperCase()}${mode.slice(1)}`, locale)}
          </button>;
        })}
      </div>
    </div>
  </div>;
}

/** Results in the selected view. */
export function VenueResultsV2({ venues, view, locale, compact = false }: { venues: Venue[]; view: ViewMode; locale: Locale; compact?: boolean }) {
  if (view === "images") {
    return <div className={`${styles.tiles} ${compact ? styles.tilesCompact : ""}`}>{venues.map((venue) => {
      const photos = photoCountOf(venue);
      return <Link key={venue.id} className={styles.tile} href={`/venues/${venue.id}`}>
        <img src={venueImage(venue)} alt="" loading="lazy" />
        <span className={styles.tileCount}><Camera size={12} aria-hidden="true" />{formatNumber(photos, locale)}</span>
        <span className={styles.tileMeta}><strong>{venue.name}</strong><span>{venue.area} · {formatETB(venue.price, locale)}</span></span>
      </Link>;
    })}</div>;
  }
  if (view === "map") {
    return <div className={styles.mapWrap}>
      <div className="map-placeholder"><MapPin size={24} aria-hidden="true" /><span>{t("mapPlaceholder", locale)}</span></div>
      <p className="small-note">{vt("mapNote", locale)}</p>
      <ul className={styles.mapList}>{venues.map((venue) => <li className={styles.mapRow} key={venue.id}>
        <MapPin size={16} aria-hidden="true" />
        <span><Link href={`/venues/${venue.id}`}>{venue.name}</Link><small>{venue.area}</small></span>
        <span className={styles.mapPrice}>{formatETB(venue.price, locale)}</span>
      </li>)}</ul>
    </div>;
  }
  return <div className={compact ? styles.stack : "venue-list"}>{venues.map((venue) => <VenueCardV2 key={venue.id} venue={venue} />)}</div>;
}
