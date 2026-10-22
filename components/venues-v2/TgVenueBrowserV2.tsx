"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { venueTypeLabel } from "@/lib/venues";
import { useVenueFiltersV2 } from "@/lib/venue-filters-v2";
import { tv2, type V2CopyKey } from "@/lib/venue-filters-v2-copy";
import { ListState } from "@/components/StatePatterns";
import { useDemoLoading } from "@/components/CoreFlow";
import { TgSheet } from "@/components/tg/TgSheet";
import { VenueFiltersV2 } from "./VenueFiltersV2";
import { VenueResultsToolbarV2, VenueResultsV2 } from "./VenueResultsV2";
import "./venues-v2.css";

/**
 * /tg venue browser for ?filters=v2. Same pattern as the existing TgVenueBrowser:
 * search bar, Filters button, active chips and a bottom sheet with Clear / Apply.
 * Honors the same ?q= ?area= ?type= initial state.
 */
export function TgVenueBrowserV2() {
  const { locale, venues, bookings } = useDemo();
  const params = useSearchParams();
  const loading = useDemoLoading();
  const [sheetOpen, setSheetOpen] = useState(false);
  const type = params.get("type");
  const controller = useVenueFiltersV2(venues, bookings, {
    query: params.get("q") ?? "",
    area: params.get("area") ?? "",
    types: type ? [type] : [],
  });
  const { filters, update, toggle, clear, results, activeCount, sort, setSort, view, setView } = controller;

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.types.map((value) => ({ key: `type-${value}`, label: venueTypeLabel(value, locale), remove: () => toggle("types", value) })),
    ...(filters.area ? [{ key: "area", label: filters.area, remove: () => { update("area", ""); update("nearby", false); } }] : []),
    ...(filters.area && filters.nearby ? [{ key: "nearby", label: tv2("fIncludeNearby", locale), remove: () => update("nearby", false) }] : []),
    ...(filters.date ? [{ key: "date", label: filters.date, remove: () => update("date", "") }] : []),
    ...filters.buckets.map((value) => ({ key: `bucket-${value}`, label: `${value} ${t("guests", locale)}`, remove: () => toggle("buckets", value) })),
    ...(filters.minimum ? [{ key: "min", label: `≥ ${formatNumber(Number(filters.minimum), locale)} ETB`, remove: () => update("minimum", "") }] : []),
    ...(filters.maximum ? [{ key: "max", label: `≤ ${formatNumber(Number(filters.maximum), locale)} ETB`, remove: () => update("maximum", "") }] : []),
    ...filters.settings.map((value) => ({ key: `setting-${value}`, label: tv2(`setting.${value}` as V2CopyKey, locale), remove: () => toggle("settings", value) })),
    ...filters.amenities.map((value) => ({ key: `amenity-${value}`, label: tv2(`amenity.${value}` as V2CopyKey, locale), remove: () => toggle("amenities", value) })),
    ...(filters.responds ? [{ key: "responds", label: tv2("quick.responds", locale), remove: () => update("responds", false) }] : []),
    ...(filters.popular ? [{ key: "popular", label: tv2("quick.popular", locale), remove: () => update("popular", false) }] : []),
    ...(filters.recommended ? [{ key: "recommended", label: tv2("quick.recommended", locale), remove: () => update("recommended", false) }] : []),
  ];

  const sheetFooter = <>
    <button className="btn btn-secondary full-width" type="button" onClick={clear}>
      <X size={15} aria-hidden="true" />{t("clearFilters", locale)}
    </button>
    <button className="btn btn-primary full-width" type="button" onClick={() => setSheetOpen(false)}>
      {t("applyFilters", locale)} · {formatNumber(results.length, locale)}
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
        <input className="field" value={filters.query} onChange={(event) => update("query", event.target.value)} placeholder={t("searchPlaceholder", locale)} aria-label={t("search", locale)} />
      </div>
    </form>

    <div className="tg-toolbar">
      <button className="btn btn-secondary" type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontal size={16} aria-hidden="true" />
        {t("filters", locale)}{activeCount > 0 ? ` (${formatNumber(activeCount, locale)})` : ""}
      </button>
    </div>

    {chips.length > 0 && <div className="tg-chips" role="group" aria-label={t("tgActiveFilters", locale)}>
      {chips.map((chip) => <button className="tg-chip is-active" key={chip.key} type="button" onClick={chip.remove}>
        {chip.label}
        <span className="tg-chip-x" aria-hidden="true"><X size={13} /></span>
      </button>)}
    </div>}

    <VenueResultsToolbarV2 locale={locale} idPrefix="v2-tg" count={results.length} sort={sort} onSort={setSort} view={view} onView={setView} touch />
    <ListState locale={locale} items={results.length} loading={loading} noResults={activeCount > 0} emptyKey="emptyVenues">
      <VenueResultsV2 venues={results} view={view} locale={locale} />
    </ListState>

    <TgSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={tv2("fSheetTitle", locale)} footer={sheetFooter}>
      <VenueFiltersV2 locale={locale} controller={controller} idPrefix="v2-tg" touch />
    </TgSheet>
  </div>;
}
