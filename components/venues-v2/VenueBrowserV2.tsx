"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { useVenueFiltersV2 } from "@/lib/venue-filters-v2";
import { ListState } from "@/components/StatePatterns";
import { useDemoLoading } from "@/components/CoreFlow";
import { VenueFiltersV2 } from "./VenueFiltersV2";
import { VenueResultsToolbarV2, VenueResultsV2 } from "./VenueResultsV2";
import "./venues-v2.css";

/** Web venue browser for ?filters=v2: filters in a sidebar, results with sort and view switch. */
export function VenueBrowserV2() {
  const { locale, venues, bookings } = useDemo();
  const loading = useDemoLoading();
  const controller = useVenueFiltersV2(venues, bookings);
  const { clear, results, activeCount, sort, setSort, view, setView } = controller;
  return <div className="page-stack">
    <header className="page-heading">
      <div className="eyebrow">{t("homeKicker", locale)}</div>
      <h1>{t("latestVenues", locale)}</h1>
      <p>{t("homeDescription", locale)}</p>
    </header>
    <div className="discovery-layout">
      <aside className="card" aria-label={t("ariaFilters", locale)}>
        <h2 className="v2-filters-title"><SlidersHorizontal size={18} aria-hidden="true" />{t("filters", locale)}</h2>
        <VenueFiltersV2 locale={locale} controller={controller} idPrefix="v2-web" showSearch />
        <button className="btn btn-secondary full-width v2-clear" type="button" onClick={clear}><X size={15} aria-hidden="true" />{t("clearFilters", locale)}</button>
      </aside>
      <section className="results-section" aria-labelledby="v2-web-results-title">
        <VenueResultsToolbarV2 locale={locale} idPrefix="v2-web" count={results.length} sort={sort} onSort={setSort} view={view} onView={setView} />
        <ListState locale={locale} items={results.length} loading={loading} noResults={activeCount > 0} emptyKey="emptyVenues">
          <VenueResultsV2 venues={results} view={view} locale={locale} />
        </ListState>
      </section>
    </div>
  </div>;
}
