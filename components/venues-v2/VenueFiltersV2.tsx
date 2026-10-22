"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { venueTypeLabel } from "@/lib/venues";
import {
  AMENITY_TAGS, GUEST_BUCKETS, QUICK_FILTERS, SETTINGS, nearbyAreas,
  type VenueFiltersV2Controller,
} from "@/lib/venue-filters-v2";
import { tv2, type V2CopyKey } from "@/lib/venue-filters-v2-copy";
import "./venues-v2.css";

function Check({ id, checked, onChange, disabled, children }: {
  id: string; checked: boolean; onChange: () => void; disabled?: boolean; children: ReactNode;
}) {
  return <label className={`v2-option${disabled ? " is-disabled" : ""}`} htmlFor={id}>
    <input id={id} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
    <span>{children}</span>
  </label>;
}

/**
 * All v2 filter controls. Shared by the web sidebar and the /tg bottom sheet.
 * `idPrefix` keeps control ids unique; `showSearch` lets /tg keep its search bar
 * outside the sheet; `touch` raises tap targets to 44px.
 */
export function VenueFiltersV2({ locale, controller, idPrefix, showSearch = false, touch = false }: {
  locale: Locale; controller: VenueFiltersV2Controller; idPrefix: string; showSearch?: boolean; touch?: boolean;
}) {
  const { filters, update, toggle, areas, types } = controller;
  const id = (name: string) => `${idPrefix}-${name}`;
  const canIncludeNearby = Boolean(filters.area) && nearbyAreas(filters.area).length > 0;
  return <div className={`v2-filters${touch ? " v2-touch" : ""}`}>
    {showSearch && <div className="v2-group">
      <label className="sr-only" htmlFor={id("search")}>{t("search", locale)}</label>
      <div className="v2-search">
        <Search size={16} aria-hidden="true" />
        <input id={id("search")} className="field" value={filters.query} onChange={(event) => update("query", event.target.value)} placeholder={t("searchPlaceholder", locale)} />
      </div>
    </div>}

    <fieldset className="v2-group">
      <legend className="v2-legend">{tv2("fVenueType", locale)}</legend>
      <div className="v2-options">
        {types.map((type) => <Check key={type} id={id(`type-${type}`)} checked={filters.types.includes(type)} onChange={() => toggle("types", type)}>{venueTypeLabel(type, locale)}</Check>)}
      </div>
    </fieldset>

    <fieldset className="v2-group">
      <legend className="v2-legend">{tv2("fLocation", locale)}</legend>
      <label className="sr-only" htmlFor={id("area")}>{tv2("fLocation", locale)}</label>
      <select id={id("area")} className="field" value={filters.area} onChange={(event) => update("area", event.target.value)}>
        <option value="">{t("allAreas", locale)}</option>
        {areas.map((area) => <option key={area} value={area}>{area}</option>)}
      </select>
      <div className="v2-nearby">
        <Check id={id("nearby")} checked={filters.nearby} onChange={() => update("nearby", !filters.nearby)} disabled={!canIncludeNearby}>{tv2("fIncludeNearby", locale)}</Check>
        {!filters.area && <p className="v2-hint">{tv2("fNoNearby", locale)}</p>}
      </div>
    </fieldset>

    <fieldset className="v2-group">
      <legend className="v2-legend">{tv2("fDate", locale)}</legend>
      <label className="sr-only" htmlFor={id("date")}>{tv2("fDate", locale)}</label>
      <input id={id("date")} className="field" type="date" value={filters.date} onChange={(event) => update("date", event.target.value)} />
    </fieldset>

    <fieldset className="v2-group">
      <legend className="v2-legend">{tv2("fGuests", locale)}</legend>
      <div className="v2-options">
        {GUEST_BUCKETS.map((bucket) => <Check key={bucket.key} id={id(`bucket-${bucket.key}`)} checked={filters.buckets.includes(bucket.key)} onChange={() => toggle("buckets", bucket.key)}>{bucket.key}</Check>)}
      </div>
    </fieldset>

    <fieldset className="v2-group">
      <legend className="v2-legend">{tv2("fPrice", locale)}</legend>
      <div className="v2-price-pair">
        <div>
          <label htmlFor={id("min")}>{t("minPrice", locale)}</label>
          <input id={id("min")} className="field" type="number" min="0" inputMode="numeric" value={filters.minimum} onChange={(event) => update("minimum", event.target.value)} />
        </div>
        <div>
          <label htmlFor={id("max")}>{t("maxPrice", locale)}</label>
          <input id={id("max")} className="field" type="number" min="0" inputMode="numeric" value={filters.maximum} onChange={(event) => update("maximum", event.target.value)} />
        </div>
      </div>
    </fieldset>

    <fieldset className="v2-group">
      <legend className="v2-legend">{tv2("fSetting", locale)}</legend>
      <div className="v2-options">
        {SETTINGS.map((setting) => <Check key={setting} id={id(`setting-${setting}`)} checked={filters.settings.includes(setting)} onChange={() => toggle("settings", setting)}>{tv2(`setting.${setting}` as V2CopyKey, locale)}</Check>)}
      </div>
    </fieldset>

    <fieldset className="v2-group">
      <legend className="v2-legend">{tv2("fAmenities", locale)}</legend>
      <div className="v2-options">
        {AMENITY_TAGS.map((tag) => <Check key={tag} id={id(`amenity-${tag}`)} checked={filters.amenities.includes(tag)} onChange={() => toggle("amenities", tag)}>{tv2(`amenity.${tag}` as V2CopyKey, locale)}</Check>)}
      </div>
    </fieldset>

    <fieldset className="v2-group">
      <legend className="v2-legend">{tv2("fQuick", locale)}</legend>
      <div className="v2-chip-row">
        {QUICK_FILTERS.map((key) => <button key={key} className="v2-chip" type="button" aria-pressed={filters[key]} onClick={() => update(key, !filters[key])}>{tv2(`quick.${key}` as V2CopyKey, locale)}</button>)}
      </div>
    </fieldset>
  </div>;
}
