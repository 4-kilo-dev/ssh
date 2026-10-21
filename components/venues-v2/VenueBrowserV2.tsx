"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { useVenueDiscoveryV2 } from "@/lib/venue-discovery-v2";
import { vt } from "@/lib/venue-discovery-v2-copy";
import { ListState } from "@/components/StatePatterns";
import { useDemoLoading } from "@/components/CoreFlow";
import { TgSheet } from "@/components/tg/TgSheet";
import { VenueFiltersV2 } from "./VenueFiltersV2";
import { VenueResultsToolbarV2, VenueResultsV2 } from "./VenueResultsV2";
import styles from "./venues-v2.module.css";

/**
 * Venue filters and results for ?filters=v2. "web" shows the filters in a
 * sidebar; "tg" moves the same filters into a bottom sheet.
 */
export function VenueBrowserV2({ variant }: { variant: "web" | "tg" }) {
  const { locale, venues, bookings } = useDemo();
  const params = useSearchParams();
  const loading = useDemoLoading();
  const [sheetOpen, setSheetOpen] = useState(false);
  const type = params.get("type");
  const discovery = useVenueDiscoveryV2(venues, bookings, {
    query: params.get("q") ?? "",
    area: params.get("area") ?? "",
    types: type ? [type] : [],
  });
  const { filters, update, clear, results, activeCount, sort, setSort, view, setView } = discovery;
  const tg = variant === "tg";
  const toolbar = <VenueResultsToolbarV2 locale={locale} idPrefix={variant} count={results.length} sort={sort} onSort={setSort} view={view} onView={setView} />;
  const list = <ListState locale={locale} items={results.length} loading={loading} noResults={activeCount > 0} emptyKey="emptyVenues">
    <VenueResultsV2 venues={results} view={view} locale={locale} compact={tg} />
  </ListState>;
  const heading = <header className="page-heading">
    <div className="eyebrow">{t("homeKicker", locale)}</div>
    <h1>{t("latestVenues", locale)}</h1>
    <p>{t("homeDescription", locale)}</p>
  </header>;

  if (!tg) {
    return <div className="page-stack">
      {heading}
      <div className="discovery-layout">
        <aside className={`card ${styles.sidebar}`} aria-label={t("ariaFilters", locale)}>
          <h2 className={styles.sidebarTitle}><SlidersHorizontal size={17} aria-hidden="true" />{t("filters", locale)}</h2>
          <VenueFiltersV2 locale={locale} discovery={discovery} idPrefix="web" showSearch />
          <button className={`btn btn-secondary full-width ${styles.clear}`} type="button" onClick={clear}><X size={15} aria-hidden="true" />{t("clearFilters", locale)}</button>
        </aside>
        <section className="results-section" aria-label={t("results", locale)}>
          {toolbar}
          {list}
        </section>
      </div>
    </div>;
  }

  return <div className={`page-stack ${styles.touch}`}>
    {heading}
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
    {toolbar}
    {list}
    <TgSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      title={vt("fFiltersHeading", locale)}
      footer={<>
        <button className="btn btn-secondary full-width" type="button" onClick={clear}><X size={15} aria-hidden="true" />{t("clearFilters", locale)}</button>
        <button className="btn btn-primary full-width" type="button" onClick={() => setSheetOpen(false)}>{t("applyFilters", locale)} · {formatNumber(results.length, locale)}</button>
      </>}
    >
      <VenueFiltersV2 locale={locale} discovery={discovery} idPrefix="tg" showSearch={false} />
    </TgSheet>
  </div>;
}
