"use client";

import { Grid2X2, List, MapPin } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { Venue } from "@/lib/mock-data";
import { formatNumber } from "@/lib/format";
import { SORT_KEYS, VIEW_MODES, type SortKey, type ViewMode } from "@/lib/venue-filters-v2";
import { tv2, type V2CopyKey } from "@/lib/venue-filters-v2-copy";
import { VenueCardV2 } from "./VenueCardV2";
import "./venues-v2.css";

const viewIcons = { list: List, images: Grid2X2, map: MapPin } as const;

/** Live result count, sort select and the List / Images / Map switch. */
export function VenueResultsToolbarV2({ locale, idPrefix, count, sort, onSort, view, onView, touch = false }: {
  locale: Locale; idPrefix: string; count: number; sort: SortKey; onSort: (value: SortKey) => void;
  view: ViewMode; onView: (value: ViewMode) => void; touch?: boolean;
}) {
  return <div className={`results-toolbar${touch ? " v2-touch-bar" : ""}`}>
    <div>
      <p className="eyebrow">{t("results", locale)}</p>
      <h2 id={`${idPrefix}-results-title`} role="status">{formatNumber(count, locale)} <span className="muted">{t("venues", locale)}</span></h2>
    </div>
    <div className="v2-toolbar-controls">
      <div className="v2-sort">
        <label htmlFor={`${idPrefix}-sort`}>{tv2("fSort", locale)}</label>
        <select id={`${idPrefix}-sort`} className="field" value={sort} onChange={(event) => onSort(event.target.value as SortKey)}>
          {SORT_KEYS.map((key) => <option key={key} value={key}>{tv2(`sort.${key}` as V2CopyKey, locale)}</option>)}
        </select>
      </div>
      <div className="view-toggle v2-view-switch" role="group" aria-label={tv2("fView", locale)}>
        {VIEW_MODES.map((mode) => {
          const Icon = viewIcons[mode];
          return <button key={mode} type="button" aria-pressed={view === mode} onClick={() => onView(mode)}>
            <Icon size={16} aria-hidden="true" />{tv2(`view${mode[0].toUpperCase()}${mode.slice(1)}` as V2CopyKey, locale)}
          </button>;
        })}
      </div>
    </div>
  </div>;
}

/** Results in the selected view: Images = card grid, List = horizontal rows, Map = cards grouped by area. */
export function VenueResultsV2({ venues, view, locale }: { venues: Venue[]; view: ViewMode; locale: Locale }) {
  if (view === "map") {
    const groups = new Map<string, Venue[]>();
    venues.forEach((venue) => groups.set(venue.area, [...(groups.get(venue.area) ?? []), venue]));
    return <div className="v2-map">
      <p className="small-note">{tv2("mapNote", locale)}</p>
      {Array.from(groups, ([area, items]) => <section className="v2-map-group" key={area} aria-label={area}>
        <h3><MapPin size={18} aria-hidden="true" />{area} <span className="v2-map-count">{formatNumber(items.length, locale)}</span></h3>
        <div className="venue-grid">{items.map((venue, index) => <VenueCardV2 key={`${venue.id}-${index}`} venue={venue} />)}</div>
      </section>)}
    </div>;
  }
  return <div className={view === "list" ? "venue-list" : "venue-grid"}>
    {venues.map((venue, index) => <VenueCardV2 key={`${venue.id}-${index}`} venue={venue} />)}
  </div>;
}
