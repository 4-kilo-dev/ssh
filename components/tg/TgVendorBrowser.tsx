"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { ListState } from "@/components/StatePatterns";
import { VendorCard, useListLoading } from "@/components/VendorFlow";
import { TgSheet } from "@/components/tg/TgSheet";

export function TgVendorBrowser() {
  const { locale, vendors, categories } = useDemo();
  const params = useSearchParams();
  const loading = useListLoading();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [area, setArea] = useState(params.get("area") ?? "");
  const [service, setService] = useState(params.get("service") ?? "");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");

  const areas = useMemo(() => Array.from(new Set(vendors.map((vendor) => vendor.area))).sort(), [vendors]);
  const services = useMemo(() => Array.from(new Set(vendors.flatMap((vendor) => vendor.services))).sort(), [vendors]);
  const results = useMemo(() => vendors.filter((vendor) => {
    const haystack = `${vendor.name} ${vendor.category} ${vendor.area} ${vendor.services.join(" ")}`.toLowerCase();
    return vendor.status === "Active" && haystack.includes(query.toLowerCase()) && (!category || vendor.category === category) && (!area || vendor.area === area) && (!service || vendor.services.includes(service)) && (!minimum || vendor.startingPrice >= Number(minimum)) && (!maximum || vendor.startingPrice <= Number(maximum));
  }), [vendors, query, category, area, service, minimum, maximum]);
  const activeCount = [query, category, area, service, minimum, maximum].filter(Boolean).length;

  function clear() { setQuery(""); setCategory(""); setArea(""); setService(""); setMinimum(""); setMaximum(""); }

  const filters = <div className="tg-vendor-filters">
    <label className="label" htmlFor="tg-vendor-search">{t("search", locale)}</label>
    <div className="v2-search"><Search size={16} aria-hidden="true" /><input id="tg-vendor-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("vendorSearchPlaceholder", locale)} /></div>
    <label className="label" htmlFor="tg-vendor-category">{t("filterByCategory", locale)}</label>
    <select id="tg-vendor-category" className="field" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t("allCategories", locale)}</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select>
    <label className="label" htmlFor="tg-vendor-area">{t("allAreas", locale)}</label>
    <select id="tg-vendor-area" className="field" value={area} onChange={(event) => setArea(event.target.value)}><option value="">{t("allAreas", locale)}</option>{areas.map((value) => <option key={value} value={value}>{value}</option>)}</select>
    <label className="label" htmlFor="tg-vendor-service">{t("services", locale)}</label>
    <select id="tg-vendor-service" className="field" value={service} onChange={(event) => setService(event.target.value)}><option value="">{t("services", locale)}</option>{services.map((value) => <option key={value} value={value}>{value}</option>)}</select>
    <div className="tg-vendor-price-row"><label className="label" htmlFor="tg-vendor-min">{t("minPrice", locale)}<input id="tg-vendor-min" className="field" type="number" min="0" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label><label className="label" htmlFor="tg-vendor-max">{t("maxPrice", locale)}<input id="tg-vendor-max" className="field" type="number" min="0" value={maximum} onChange={(event) => setMaximum(event.target.value)} /></label></div>
  </div>;

  return <div className="page-stack tg-vendor-page">
    <div className="venue-discovery-intro">
      <div className="breadcrumbs"><Link href="/tg">{t("home", locale)}</Link><span aria-hidden="true">/</span><span>{t("vendors", locale)}</span></div>
      <form className="venue-discovery-search" role="search" onSubmit={(event) => event.preventDefault()}><Search size={20} aria-hidden="true" /><input className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("vendorSearchPlaceholder", locale)} aria-label={t("search", locale)} /></form>
      <header className="page-heading"><div className="eyebrow">{t("homeKicker", locale)}</div><h1>{t("vendors", locale)}</h1><p>{t("vendorDirectory", locale)}</p></header>
    </div>
    <div className="tg-toolbar"><button className="btn btn-secondary" type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog"><SlidersHorizontal size={16} aria-hidden="true" />{t("filters", locale)}{activeCount > 0 ? ` (${formatNumber(activeCount, locale)})` : ""}</button><p className="eyebrow" role="status">{formatNumber(results.length, locale)} {t("vendors", locale)}</p></div>
    <ListState locale={locale} items={results.length} loading={loading} noResults={activeCount > 0} emptyKey="emptyVendors"><div className="vendor-market-grid tg-vendor-grid">{results.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}</div></ListState>
    <TgSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("filters", locale)} footer={<><button className="btn btn-secondary full-width" type="button" onClick={clear}><X size={15} aria-hidden="true" />{t("clearFilters", locale)}</button><button className="btn btn-primary full-width" type="button" onClick={() => setSheetOpen(false)}>{t("applyFilters", locale)} · {formatNumber(results.length, locale)}</button></>}>
      {filters}
    </TgSheet>
  </div>;
}
