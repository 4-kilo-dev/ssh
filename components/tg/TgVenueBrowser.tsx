"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { amenityLabel, useVenueFilters, venueTypeLabel } from "@/lib/venues";
import { ListState } from "@/components/StatePatterns";
import { VenueCard, useDemoLoading } from "@/components/CoreFlow";
import { TgSheet } from "@/components/tg/TgSheet";

/**
 * Mini App venue list. Same shared filter hook, predicate and option lists as
 * the web VenueBrowser, but the filter rail becomes a bottom sheet and results
 * are a single column of the same VenueCard.
 */
export function TgVenueBrowser() {
  const { locale, venues, bookings } = useDemo();
  const params = useSearchParams();
  const loading = useDemoLoading();
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    query, setQuery, area, setArea, date, setDate, capacity, setCapacity,
    minimum, setMinimum, maximum, setMaximum, type, setType, amenity, setAmenity,
    areas, types, amenities, filtered, hasFilter, clear,
  } = useVenueFilters(venues, bookings, {
    query: params.get("q") ?? "",
    area: params.get("area") ?? "",
    type: params.get("type") ?? "",
  });

  const activeChips = [
    area && { key: "area", label: area, clear: () => setArea("") },
    type && { key: "type", label: venueTypeLabel(type, locale), clear: () => setType("") },
    date && { key: "date", label: date, clear: () => setDate("") },
    capacity && { key: "capacity", label: `≥ ${formatNumber(Number(capacity), locale)}`, clear: () => setCapacity("") },
    minimum && { key: "minimum", label: `≥ ${formatNumber(Number(minimum), locale)} ETB`, clear: () => setMinimum("") },
    maximum && { key: "maximum", label: `≤ ${formatNumber(Number(maximum), locale)} ETB`, clear: () => setMaximum("") },
    amenity && { key: "amenity", label: amenityLabel(amenity, locale), clear: () => setAmenity("") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];
  const activeCount = activeChips.length + (query ? 1 : 0);

  const sheetFooter = <>
    <button className="btn btn-secondary full-width" type="button" onClick={clear}>
      <X size={15} aria-hidden="true" />{t("clearFilters", locale)}
    </button>
    <button className="btn btn-primary full-width" type="button" onClick={() => setSheetOpen(false)}>
      {t("applyFilters", locale)} · {formatNumber(filtered.length, locale)}
    </button>
  </>;

  return <div className="page-stack">
    <header className="page-heading">
      <div className="eyebrow">{t("homeKicker", locale)}</div>
      <h1>{t("latestVenues", locale)}</h1>
      <p>{t("homeDescription", locale)}</p>
    </header>

    <form className="tg-searchbar" role="search" onSubmit={(event) => event.preventDefault()}>
      <div className="search-field">
        <Search size={16} aria-hidden="true" />
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder", locale)}
          aria-label={t("search", locale)}
        />
      </div>
    </form>

    <div className="tg-toolbar">
      <button className="btn btn-secondary" type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontal size={16} aria-hidden="true" />
        {t("filters", locale)}{activeCount > 0 ? ` (${formatNumber(activeCount, locale)})` : ""}
      </button>
      <p className="eyebrow" role="status">{formatNumber(filtered.length, locale)} {t("venues", locale)}</p>
    </div>

    {activeChips.length > 0 && <div className="tg-chips" role="group" aria-label={t("tgActiveFilters", locale)}>
      {activeChips.map((chip) => <button className="tg-chip is-active" key={chip.key} type="button" onClick={chip.clear}>
        {chip.label}
        <span className="tg-chip-x" aria-hidden="true"><X size={13} /></span>
      </button>)}
    </div>}

    <ListState locale={locale} items={filtered.length} loading={loading} noResults={hasFilter} emptyKey="emptyVenues">
      <div className="venue-grid">
        {filtered.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
      </div>
    </ListState>

    <TgSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("filters", locale)} footer={sheetFooter}>
      <label className="label" htmlFor="tg-filter-date">{t("filterByDate", locale)}</label>
      <input id="tg-filter-date" className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />

      <label className="label" htmlFor="tg-filter-area">{t("filterByArea", locale)}</label>
      <select id="tg-filter-area" className="field" value={area} onChange={(event) => setArea(event.target.value)}>
        <option value="">{t("allAreas", locale)}</option>
        {areas.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>

      <label className="label" htmlFor="tg-filter-type">{t("filterByType", locale)}</label>
      <select id="tg-filter-type" className="field" value={type} onChange={(event) => setType(event.target.value)}>
        <option value="">{t("allTypes", locale)}</option>
        {types.map((value) => <option key={value} value={value}>{venueTypeLabel(value, locale)}</option>)}
      </select>

      <label className="label" htmlFor="tg-filter-capacity">{t("filterByCapacity", locale)}</label>
      <input id="tg-filter-capacity" className="field" type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder={t("minCapacity", locale)} />

      <div className="field-pair">
        <div>
          <label className="label" htmlFor="tg-filter-min">{t("minPrice", locale)}</label>
          <input id="tg-filter-min" className="field" type="number" min="0" value={minimum} onChange={(event) => setMinimum(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="tg-filter-max">{t("maxPrice", locale)}</label>
          <input id="tg-filter-max" className="field" type="number" min="0" value={maximum} onChange={(event) => setMaximum(event.target.value)} />
        </div>
      </div>

      <label className="label" htmlFor="tg-filter-amenity">{t("filterByAmenities", locale)}</label>
      <select id="tg-filter-amenity" className="field" value={amenity} onChange={(event) => setAmenity(event.target.value)}>
        <option value="">{t("all", locale)}</option>
        {amenities.map((value) => <option key={value} value={value}>{amenityLabel(value, locale)}</option>)}
      </select>

      <p className="small-note">{t("dateRule", locale)}</p>
    </TgSheet>
  </div>;
}
