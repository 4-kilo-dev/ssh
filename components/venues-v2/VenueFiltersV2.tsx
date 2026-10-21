"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { venueTypeLabel } from "@/lib/venues";
import {
  AMENITY_KEYS, GUEST_BUCKETS, SETTINGS, nearbyAreas,
  type DiscoveryFilters, type useVenueDiscoveryV2,
} from "@/lib/venue-discovery-v2";
import { vt } from "@/lib/venue-discovery-v2-copy";
import styles from "./venues-v2.module.css";

type Discovery = ReturnType<typeof useVenueDiscoveryV2>;

function Option({ id, checked, onChange, children, count, disabled }: {
  id: string; checked: boolean; onChange: () => void; children: ReactNode; count?: string; disabled?: boolean;
}) {
  return <label className={styles.option} htmlFor={id}>
    <input id={id} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
    <span>{children}</span>
    {count && <span className={styles.optionCount}>{count}</span>}
  </label>;
}

/**
 * All v2 filters. Rendered inside the web sidebar and inside the /tg bottom
 * sheet. `idPrefix` keeps control ids unique and `showSearch` lets /tg keep its
 * search bar outside the sheet.
 */
export function VenueFiltersV2({ locale, discovery, idPrefix, showSearch }: {
  locale: Locale; discovery: Discovery; idPrefix: string; showSearch: boolean;
}) {
  const { filters, update, toggle, areas, types, bucketCounts } = discovery;
  const id = (name: string) => `${idPrefix}-${name}`;
  const hasNearby = Boolean(filters.area) && nearbyAreas(filters.area).length > 0;
  const quick: { key: "responds" | "popular" | "recommended"; label: string }[] = [
    { key: "responds", label: vt("quickResponds", locale) },
    { key: "popular", label: vt("quickPopular", locale) },
    { key: "recommended", label: vt("quickRecommended", locale) },
  ];
  const set = <K extends keyof DiscoveryFilters>(key: K) => (value: DiscoveryFilters[K]) => update(key, value);

  return <div className={styles.panel}>
    {showSearch && <div className={styles.group}>
      <label className="sr-only" htmlFor={id("search")}>{t("search", locale)}</label>
      <div className="search-field" style={{ position: "relative" }}>
        <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: 14, zIndex: 1, color: "#6d7d77" }} />
        <input id={id("search")} className="field" style={{ paddingLeft: 36 }} value={filters.query} onChange={(e) => set("query")(e.target.value)} placeholder={t("searchPlaceholder", locale)} />
      </div>
    </div>}

    <fieldset className={styles.group}>
      <legend className={styles.legend}>{vt("fVenueType", locale)}</legend>
      <div className={styles.options}>
        {types.map((type) => <Option key={type} id={id(`type-${type}`)} checked={filters.types.includes(type)} onChange={() => toggle("types", type)}>{venueTypeLabel(type, locale)}</Option>)}
      </div>
    </fieldset>

    <fieldset className={styles.group}>
      <legend className={styles.legend}>{vt("fLocation", locale)}</legend>
      <label className="sr-only" htmlFor={id("area")}>{vt("fLocation", locale)}</label>
      <select id={id("area")} className="field" value={filters.area} onChange={(e) => update("area", e.target.value)}>
        <option value="">{t("allAreas", locale)}</option>
        {areas.map((area) => <option key={area} value={area}>{area}</option>)}
      </select>
      <Option id={id("nearby")} checked={filters.nearby} onChange={() => update("nearby", !filters.nearby)} disabled={!hasNearby}>{vt("fIncludeNearby", locale)}</Option>
      {!filters.area && <p className={styles.hint}>{vt("noNearby", locale)}</p>}
    </fieldset>

    <fieldset className={styles.group}>
      <legend className={styles.legend}>{vt("fDate", locale)}</legend>
      <label className="sr-only" htmlFor={id("date")}>{vt("fDate", locale)}</label>
      <input id={id("date")} className="field" type="date" value={filters.date} onChange={(e) => update("date", e.target.value)} />
    </fieldset>

    <fieldset className={styles.group}>
      <legend className={styles.legend}>{vt("fGuests", locale)}</legend>
      <div className={styles.options}>
        {GUEST_BUCKETS.map((bucket) => <Option key={bucket.key} id={id(`bucket-${bucket.key}`)} checked={filters.buckets.includes(bucket.key)} onChange={() => toggle("buckets", bucket.key)} count={formatNumber(bucketCounts[bucket.key] ?? 0, locale)}>{bucket.label}</Option>)}
      </div>
    </fieldset>

    <fieldset className={styles.group}>
      <legend className={styles.legend}>{vt("fPrice", locale)}</legend>
      <div className={styles.pricePair}>
        <div><label htmlFor={id("min")}>{t("minPrice", locale)}</label><input id={id("min")} className="field" type="number" min="0" inputMode="numeric" value={filters.minimum} onChange={(e) => update("minimum", e.target.value)} /></div>
        <div><label htmlFor={id("max")}>{t("maxPrice", locale)}</label><input id={id("max")} className="field" type="number" min="0" inputMode="numeric" value={filters.maximum} onChange={(e) => update("maximum", e.target.value)} /></div>
      </div>
    </fieldset>

    <fieldset className={styles.group}>
      <legend className={styles.legend}>{vt("fSetting", locale)}</legend>
      <div className={styles.options}>
        {SETTINGS.map((setting) => <Option key={setting} id={id(`setting-${setting}`)} checked={filters.settings.includes(setting)} onChange={() => toggle("settings", setting)}>{vt(`setting_${setting}`, locale)}</Option>)}
      </div>
    </fieldset>

    <fieldset className={styles.group}>
      <legend className={styles.legend}>{vt("fAmenities", locale)}</legend>
      <div className={styles.options}>
        {AMENITY_KEYS.map((key) => <Option key={key} id={id(`amenity-${key}`)} checked={filters.amenities.includes(key)} onChange={() => toggle("amenities", key)}>{vt(`amenity_${key}`, locale)}</Option>)}
      </div>
    </fieldset>

    <fieldset className={styles.group}>
      <legend className={styles.legend}>{vt("fQuick", locale)}</legend>
      <div className={styles.options}>
        {quick.map(({ key, label }) => <Option key={key} id={id(`quick-${key}`)} checked={filters[key]} onChange={() => update(key, !filters[key])}>{label}</Option>)}
      </div>
    </fieldset>
  </div>;
}
