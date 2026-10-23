"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { useVenueFiltersV2, type SortKey } from "@/lib/venue-filters-v2";
import { tv2, type V2CopyKey } from "@/lib/venue-filters-v2-copy";
import { ListState } from "@/components/StatePatterns";
import { VenueCard, useDemoLoading } from "@/components/CoreFlow";
import { TgSheet } from "@/components/tg/TgSheet";
import { VenueFiltersV2 } from "@/components/venues-v2/VenueFiltersV2";

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

  const controller = useVenueFiltersV2(venues, bookings, {
    query: params.get("q") ?? "",
    area: params.get("area") ?? "",
    types: params.get("type") ? [params.get("type") as string] : [],
  });
  const { filters, results, activeCount, clear, sort, setSort } = controller;

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
        <input
          className="field"
          value={filters.query}
          onChange={(event) => controller.update("query", event.target.value)}
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
      <div className="v2-sort"><label htmlFor="tg-venue-sort">{tv2("fSort", locale)}</label><select id="tg-venue-sort" className="field" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>{(["recommended", "priceLow", "priceHigh", "capacityHigh", "capacityLow"] as SortKey[]).map((key) => <option key={key} value={key}>{tv2(`sort.${key}` as V2CopyKey, locale)}</option>)}</select></div>
      <p className="eyebrow" role="status">{formatNumber(results.length, locale)} {t("venues", locale)}</p>
    </div>

    <ListState locale={locale} items={results.length} loading={loading} noResults={activeCount > 0} emptyKey="emptyVenues">
      <div className="venue-grid">
        {results.map((venue, index) => <VenueCard key={`${venue.id}-${index}`} venue={venue} />)}
      </div>
    </ListState>

    <TgSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("filters", locale)} footer={sheetFooter}>
      <VenueFiltersV2 locale={locale} controller={controller} idPrefix="tg-venue" touch />
    </TgSheet>
  </div>;
}
