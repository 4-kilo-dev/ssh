"use client";

import { Link, useRouter } from "@/lib/nav";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleDollarSign, MessageCircle, Search, Settings, ShieldAlert, Star, Users } from "lucide-react";
import type { Inquiry, Vendor } from "@/lib/mock-data";
import { useDemo } from "@/lib/store";
import { formatDate, formatETB, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { FormState, ListState, type FormStatus } from "@/components/StatePatterns";
import { StatusBadge } from "@/components/StatusBadge";
import { vendorGallery, vendorImage } from "@/lib/images";

const categoryKeys: Record<string, string> = {
  Photography: "categoryPhotography", Catering: "categoryCatering", Decor: "categoryDecor",
  "Music & sound": "categoryMusic", Beauty: "categoryBeauty", Video: "categoryVideo", Flowers: "categoryFlowers",
};
const localCategory = (value: string, locale: "en" | "am") => t(categoryKeys[value] || "categoryOther", locale);
function useListLoading() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 220); return () => window.clearTimeout(timer); }, []);
  return loading;
}
function Heading({ title, description }: { title: string; description?: string }) {
  const { locale } = useDemo();
  return <header className="page-heading"><p className="eyebrow">{t("homeKicker", locale)}</p><h1>{title}</h1>{description && <p>{description}</p>}</header>;
}
function DemoNotice() {
  const { locale } = useDemo();
  return <div className="demo-notice" role="note"><ShieldAlert size={18} aria-hidden="true" /><div><strong>{t("demoNotice", locale)}</strong><p>{t("noTransactions", locale)} {t("noCredentials", locale)}</p></div></div>;
}
function VendorCard({ vendor }: { vendor: Vendor }) {
  const { locale } = useDemo();
  return <article className="vendor-market-card card">
    <Link className="vendor-market-photo" href={`/vendors/${vendor.id}`} aria-label={`${t("viewDetails", locale)}: ${vendor.name}`}>
      <img src={vendorImage(vendor.category)} alt={`${localCategory(vendor.category, locale)} sample portfolio`} loading="lazy" />
      <span className="photo-chip">{localCategory(vendor.category, locale)}</span>
    </Link>
    <div className="vendor-market-copy"><div className="card-title-row"><h2><Link href={`/vendors/${vendor.id}`}>{vendor.name}</Link></h2><span className="rating"><Star size={14} fill="currentColor" aria-hidden="true" />4.8</span></div>
      <p className="muted">{vendor.description}</p><div className="vendor-card-facts"><span><Users size={15} aria-hidden="true" />{vendor.area}</span><span>{t("startingAt", locale)} <strong>{formatETB(vendor.startingPrice, locale)}</strong></span></div>
      <div className="tag-list">{vendor.services.slice(0, 2).map((service) => <span className="tag" key={service}>{service}</span>)}</div>
      <Link className="text-link" href={`/vendors/${vendor.id}`}>{t("viewDetails", locale)} <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  </article>;
}

export function CustomerVendorBrowser() {
  const { locale, vendors, categories } = useDemo();
  const loading = useListLoading();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const filtered = vendors.filter((vendor) => vendor.status === "Active" && (!category || vendor.category === category) && `${vendor.name} ${vendor.category} ${vendor.area} ${vendor.services.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const hasFilter = Boolean(query || category);
  return <div className="page-stack">
    <Heading title={t("vendors", locale)} description={t("vendorDirectory", locale)} />
    <div className="card vendor-filter-panel">
      <label className="label" htmlFor="vendor-search"><Search size={15} aria-hidden="true" />{t("search", locale)}</label>
      <input id="vendor-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("vendorSearchPlaceholder", locale)} />
      <label className="label" htmlFor="vendor-category">{t("filterByCategory", locale)}</label>
      <select id="vendor-category" className="field" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t("allCategories", locale)}</option>{categories.map((value) => <option key={value} value={value}>{localCategory(value, locale)}</option>)}</select>
      <button className="btn btn-secondary" type="button" onClick={() => { setQuery(""); setCategory(""); }}>{t("clearFilters", locale)}</button>
    </div>
    <section className="results-section" aria-label={t("vendors", locale)}><div className="results-toolbar"><div><p className="eyebrow">{t("results", locale)}</p><h2>{formatNumber(filtered.length, locale)} {t("vendors", locale)}</h2></div></div>
      <ListState locale={locale} items={filtered.length} loading={loading} noResults={hasFilter} emptyKey="emptyVendors"><div className="vendor-market-grid">{filtered.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}</div></ListState>
    </section>
  </div>;
}

export function VendorProfile({ vendorId }: { vendorId: string }) {
  const { locale, vendors, customers, inquiries, savedVendors, toggleSaved, contactVendorAfterAcceptance } = useDemo();
  const vendor = vendors.find((item) => item.id === vendorId && item.status === "Active");
  if (!vendor) return <section className="card"><h1>{t("pageNotFound", locale)}</h1><Link className="btn btn-secondary" href="/vendors">{t("backToVendors", locale)}</Link></section>;
  const isSaved = savedVendors.includes(vendor.id);
  const accepted = inquiries.some((item) => item.vendorId === vendor.id && item.customer === (customers.find((customer) => customer.id === "customer-1")?.name || "Hana Bekele") && item.status === "Confirmed");
  const showContact = !contactVendorAfterAcceptance || accepted;
  return <div className="page-stack">
    <div className="breadcrumbs"><Link href="/vendors">{t("vendors", locale)}</Link><span aria-hidden="true">/</span><span>{vendor.name}</span></div>
    <div className="vendor-profile-hero card"><img src={vendorImage(vendor.category)} alt={`${vendor.name} portfolio sample`} /><div><p className="eyebrow">{localCategory(vendor.category, locale)}</p><h1>{vendor.name}</h1><p>{vendor.description}</p><div className="vendor-card-facts"><span>{vendor.area}, Addis Ababa</span><span>{t("startingAt", locale)} <strong>{formatETB(vendor.startingPrice, locale)}</strong></span></div><div className="hero-actions"><Link className="btn btn-primary" href={`/inquiries/new?vendor=${vendor.id}`}>{t("sendInquiry", locale)}</Link><button className="btn btn-secondary" type="button" aria-pressed={isSaved} onClick={() => toggleSaved(vendor.id)}>{t(isSaved ? "removeSaved" : "saveVendor", locale)}</button></div></div></div>
    <div className="vendor-profile-grid"><section className="card"><h2>{t("services", locale)}</h2><div className="tag-list">{vendor.services.map((service) => <span className="tag" key={service}>{service}</span>)}</div><h2 className="mt-6">{t("serviceAreasLabel", locale)}</h2><p>{vendor.area} · Addis Ababa</p><h2>{t("gallery", locale)}</h2><div className="vendor-gallery">{vendorGallery(vendor.category).map((image, index) => <img key={image} src={image} alt={`${vendor.name} portfolio example ${index + 1}`} loading="lazy" />)}</div></section>
      <aside className="card"><h2>{t("contactInfo", locale)}</h2><p className="muted">{showContact ? (vendor.contact || t("contactDemoValue", locale)) : t("contactHiddenVendor", locale)}</p><p className="small-note"><ShieldAlert size={14} aria-hidden="true" />{t("accessNotice", locale)}</p><Link className="btn btn-primary full-width" href={`/inquiries/new?vendor=${vendor.id}`}>{t("sendInquiry", locale)}</Link></aside></div>
  </div>;
}

export function InquiryRequest() {
  const demo = useDemo(); const { locale, createInquiry } = demo;
  const params = useSearchParams();
  const router = useRouter();
  const initialVendor = params.get("vendor") || "";
  const [selected, setSelected] = useState<string[]>(initialVendor ? [initialVendor] : []);
  const [customer, setCustomer] = useState(demo.customers.find((item) => item.id === "customer-1")?.name || "Hana Bekele");
  const [eventDate, setEventDate] = useState("");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const vendors = demo.vendors.filter((vendor) => vendor.status === "Active");
  function toggle(vendorId: string) { setSelected((current) => current.includes(vendorId) ? current.filter((id) => id !== vendorId) : [...current, vendorId]); }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!customer.trim()) next.customer = t("nameRequired", locale);
    if (!eventDate) next.date = t("dateRequired", locale);
    else if (eventDate < new Date().toISOString().slice(0, 10)) next.date = t("futureDate", locale);
    if (!selected.length) next.vendors = t("chooseVendorError", locale);
    if (!detail.trim()) next.detail = t("messageRequired", locale);
    setErrors(next);
    if (Object.keys(next).length) { setStatus("error"); setMessage(t("fixFields", locale)); return; }
    setStatus("loading"); setMessage("");
    window.setTimeout(() => {
      selected.forEach((vendorId) => createInquiry({ vendorId, customer: customer.trim(), eventDate, detail: detail.trim() }));
      setStatus("success"); setMessage(t("inquirySuccess", locale));
      window.setTimeout(() => router.push(`/inquiries/sent?count=${selected.length}`), 240);
    }, 280);
  }
  return <div className="page-stack narrow-form"><Heading title={t("inquiryRequest", locale)} description={t("inquiryHelp", locale)} />
    <FormState status={status} locale={locale} message={message}><form className="card form-card" onSubmit={submit} noValidate>
      <label className="label" htmlFor="inquiry-customer">{t("fullName", locale)} <span aria-hidden="true">*</span></label><input id="inquiry-customer" className={`field ${errors.customer ? "field-error" : ""}`} value={customer} onChange={(e) => setCustomer(e.target.value)} aria-invalid={!!errors.customer} aria-describedby={errors.customer ? "inquiry-name-error" : undefined} />{errors.customer && <p className="field-error-text" id="inquiry-name-error">{errors.customer}</p>}
      <label className="label" htmlFor="inquiry-date">{t("eventDateLabel", locale)} <span aria-hidden="true">*</span></label><input id="inquiry-date" className={`field ${errors.date ? "field-error" : ""}`} type="date" min={new Date().toISOString().slice(0, 10)} value={eventDate} onChange={(e) => setEventDate(e.target.value)} aria-invalid={!!errors.date} aria-describedby={errors.date ? "inquiry-date-error" : undefined} />{errors.date && <p className="field-error-text" id="inquiry-date-error">{errors.date}</p>}
      <fieldset className="vendor-choice-fieldset"><legend>{t("chooseVendors", locale)} <span aria-hidden="true">*</span></legend><p className="field-help">{t("chooseVendorsHelp", locale)}</p><div className="checkbox-grid">{vendors.map((vendor) => <label className="checkbox-card" key={vendor.id}><input type="checkbox" checked={selected.includes(vendor.id)} onChange={() => toggle(vendor.id)} /><span><strong>{vendor.name}</strong><small>{localCategory(vendor.category, locale)} · {vendor.area}</small></span></label>)}</div>{errors.vendors && <p className="field-error-text" role="alert">{errors.vendors}</p>}</fieldset>
      <label className="label" htmlFor="inquiry-detail">{t("requestDetails", locale)} <span aria-hidden="true">*</span></label><textarea id="inquiry-detail" className={`field textarea ${errors.detail ? "field-error" : ""}`} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={t("inquiryPlaceholder", locale)} aria-invalid={!!errors.detail} aria-describedby={errors.detail ? "inquiry-detail-error" : undefined} />{errors.detail && <p className="field-error-text" id="inquiry-detail-error">{errors.detail}</p>}
      <div className="form-actions"><Link className="btn btn-secondary" href="/vendors">{t("cancel", locale)}</Link><button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("sendInquiry", locale)} <ArrowRight size={15} aria-hidden="true" /></button></div><p className="small-note">{t("demoOnlyForm", locale)}</p>
    </form></FormState>
  </div>;
}

export function InquirySent() {
  const { locale } = useDemo();
  const params = useSearchParams();
  const count = Number(params.get("count") || "1");
  return <section className="card success-panel"><CheckCircle2 size={34} aria-hidden="true" /><p className="eyebrow">{t("formSuccess", locale)}</p><h1>{t("inquirySentTitle", locale)}</h1><p>{formatNumber(count, locale)} {t(count === 1 ? "vendor" : "vendors", locale)} · {t("inquirySentText", locale)}</p><div className="form-actions"><Link className="btn btn-primary" href="/my-inquiries">{t("myInquiries", locale)}</Link><Link className="btn btn-secondary" href="/vendors">{t("backToVendors", locale)}</Link></div></section>;
}

export function CustomerInquiries() {
  const demo = useDemo(); const { locale, inquiries, vendors } = demo;
  const customerName = demo.customers.find((item) => item.id === "customer-1")?.name || "Hana Bekele";
  const loading = useListLoading();
  const [query, setQuery] = useState("");
  const mine = inquiries.filter((item) => item.customer === customerName);
  const filtered = mine.filter((item) => { const vendor = vendors.find((v) => v.id === item.vendorId); return `${vendor?.name || ""} ${item.detail} ${item.status}`.toLowerCase().includes(query.toLowerCase()); });
  return <div className="page-stack"><Heading title={t("myInquiries", locale)} description={t("inquiryListHelp", locale)} />
    <label className="label" htmlFor="my-inquiry-search">{t("search", locale)}</label><input id="my-inquiry-search" className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchInquiriesPlaceholder", locale)} />
    <ListState locale={locale} items={filtered.length} loading={loading} noResults={Boolean(query)} emptyKey="noInquiries"><div className="stacked-list">{filtered.map((inquiry) => <CustomerInquiryRow inquiry={inquiry} key={inquiry.id} />)}</div></ListState>
  </div>;
}
function CustomerInquiryRow({ inquiry }: { inquiry: Inquiry }) {
  const { locale, vendors } = useDemo();
  const vendor = vendors.find((v) => v.id === inquiry.vendorId);
  return <article className="card inquiry-row"><div><p className="eyebrow">{localCategory(vendor?.category || "", locale)}</p><h2>{vendor?.name || t("vendor", locale)}</h2><p className="muted line-clamp-2">{inquiry.detail}</p><p className="small-note"><CalendarDays size={14} aria-hidden="true" />{formatDate(inquiry.eventDate, locale)}</p></div><div className="inquiry-row-side"><StatusBadge status={inquiry.status} locale={locale} /><Link className="btn btn-secondary" href={`/my-inquiries/${inquiry.id}`}>{t("viewDetails", locale)}</Link></div></article>;
}
export function CustomerInquiryDetail({ inquiryId }: { inquiryId: string }) {
  const demo = useDemo(); const { locale, inquiries, vendors } = demo;
  const customerName = demo.customers.find((item) => item.id === "customer-1")?.name || "Hana Bekele";
  const inquiry = inquiries.find((item) => item.id === inquiryId && item.customer === customerName);
  if (!inquiry) return <section className="card"><h1>{t("inquiryNotFound", locale)}</h1><Link className="btn btn-secondary" href="/my-inquiries">{t("myInquiries", locale)}</Link></section>;
  const vendor = vendors.find((v) => v.id === inquiry.vendorId);
  return <div className="page-stack"><div className="breadcrumbs"><Link href="/my-inquiries">{t("myInquiries", locale)}</Link><span aria-hidden="true">/</span><span>{inquiry.id}</span></div><section className="card inquiry-detail-card"><div className="card-title-row"><div><p className="eyebrow">{t("inquiryDetail", locale)}</p><h1>{vendor?.name}</h1></div><StatusBadge status={inquiry.status} locale={locale} /></div><p>{inquiry.detail}</p><p><CalendarDays size={15} aria-hidden="true" />{t("eventDateLabel", locale)} · {formatDate(inquiry.eventDate, locale)}</p><section className="response-box"><h2>{t("vendorResponse", locale)}</h2>{inquiry.response ? <p>{inquiry.response}</p> : <p className="muted">{t("noResponseYet", locale)}</p>}</section><Link className="btn btn-secondary" href="/my-inquiries"><ArrowLeft size={15} aria-hidden="true" />{t("back", locale)}</Link></section></div>;
}

export function VendorHome() {
  const { locale, inquiries, fees, vendors, previewVendorId } = useDemo();
  const vendor = vendors.find((item) => item.id === previewVendorId);
  const applicationStatus = vendor?.applicationStatus || (vendor?.status === "Active" ? "Approved" : "Pending");
  const mine = inquiries.filter((item) => item.vendorId === previewVendorId);
  const myFees = fees.filter((fee) => fee.vendorId === previewVendorId);
  const newCount = mine.filter((item) => item.status === "New").length;
  const confirmed = mine.filter((item) => item.status === "Confirmed").length;
  const outstanding = myFees.filter((fee) => fee.status === "Outstanding").reduce((sum, fee) => sum + fee.amount, 0);
  return <div className="page-stack"><Heading title={t("vendorDashboard", locale)} description={`${vendor?.name || ""} · ${localCategory(vendor?.category || "", locale)}`} />
    <div className="stats-grid"><article className="card stat-card"><span>{t("newInquiries", locale)}</span><strong>{formatNumber(newCount, locale)}</strong><MessageCircle aria-hidden="true" /></article><article className="card stat-card"><span>{t("confirmedBookings", locale)}</span><strong>{formatNumber(confirmed, locale)}</strong><CheckCircle2 aria-hidden="true" /></article><article className="card stat-card"><span>{t("feesDue", locale)}</span><strong>{formatETB(outstanding, locale)}</strong><CircleDollarSign aria-hidden="true" /></article></div>
    <div className="quick-links"><Link className="card quick-link" href="/vendor/inquiries"><MessageCircle aria-hidden="true" /><span><strong>{t("inquiries", locale)}</strong><small>{t("reviewVendorInquiries", locale)}</small></span><ArrowRight aria-hidden="true" /></Link><Link className="card quick-link" href="/vendor/fee-statements"><CircleDollarSign aria-hidden="true" /><span><strong>{t("feeStatements", locale)}</strong><small>{t("viewSampleStatements", locale)}</small></span><ArrowRight aria-hidden="true" /></Link><Link className="card quick-link" href="/vendor/profile"><MessageCircle aria-hidden="true" /><span><strong>{t("vendorListingEditorTitle", locale)}</strong><small>{t("vendorListingEditorHelp", locale)}</small></span><ArrowRight aria-hidden="true" /></Link><Link className="card quick-link" href="/vendor/application"><CheckCircle2 aria-hidden="true" /><span><strong>{t("applicationStatus", locale)}</strong><small>{t(applicationStatus === "Needs changes" ? "needsChanges" : applicationStatus.toLowerCase(), locale)}</small></span><ArrowRight aria-hidden="true" /></Link><Link className="card quick-link" href="/vendor/listing-preview"><ArrowRight aria-hidden="true" /><span><strong>{t("vendorPreviewTitle", locale)}</strong><small>{t("vendorListingEditorHelp", locale)}</small></span><ArrowRight aria-hidden="true" /></Link><Link className="card quick-link" href="/vendor/notifications"><Bell aria-hidden="true" /><span><strong>{t("notificationsTitle", locale)}</strong><small>{t("sampleStaticContent", locale)}</small></span><ArrowRight aria-hidden="true" /></Link><Link className="card quick-link" href="/vendor/settings"><Settings aria-hidden="true" /><span><strong>{t("vendorAccountSettingsTitle", locale)}</strong><small>{t("vendorNotificationSettings", locale)}</small></span><ArrowRight aria-hidden="true" /></Link></div>
  </div>;
}

export function VendorInquiries() {
  const { locale, inquiries, previewVendorId } = useDemo();
  const loading = useListLoading();
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const mine = inquiries.filter((item) => item.vendorId === previewVendorId);
  const filtered = mine.filter((item) => (!statusFilter || item.status === statusFilter) && `${item.customer} ${item.detail} ${item.eventDate}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><Heading title={t("inquiries", locale)} description={t("vendorInboxHelp", locale)} />
    <div className="list-filters"><label className="label" htmlFor="vendor-inquiry-search">{t("search", locale)}</label><input id="vendor-inquiry-search" className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchInquiriesPlaceholder", locale)} /><label className="label" htmlFor="vendor-inquiry-status">{t("status", locale)}</label><select id="vendor-inquiry-status" className="field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">{t("all", locale)}</option>{(["New", "Responded", "Confirmed", "Declined"] as const).map((value) => <option key={value} value={value}>{t(value.toLowerCase(), locale)}</option>)}</select></div>
    <ListState locale={locale} items={filtered.length} loading={loading} noResults={Boolean(query || statusFilter)} emptyKey="noInquiries"><div className="stacked-list">{filtered.map((item) => <VendorInquiryRow inquiry={item} key={item.id} />)}</div></ListState>
  </div>;
}
function VendorInquiryRow({ inquiry }: { inquiry: Inquiry }) {
  const { locale } = useDemo();
  return <article className="card inquiry-row"><div><p className="eyebrow">{formatDate(inquiry.eventDate, locale)}</p><h2>{inquiry.customer}</h2><p className="muted line-clamp-2">{inquiry.detail}</p></div><div className="inquiry-row-side"><StatusBadge status={inquiry.status} locale={locale} /><Link className="btn btn-secondary" href={`/vendor/inquiries/${inquiry.id}`}>{t("viewDetails", locale)}</Link></div></article>;
}
export function VendorInquiryDetail({ inquiryId }: { inquiryId: string }) {
  const { locale, inquiries, vendors, previewVendorId, setInquiryStatus } = useDemo();
  const inquiry = inquiries.find((item) => item.id === inquiryId && item.vendorId === previewVendorId);
  const [response, setResponse] = useState(inquiry?.response || "");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!inquiry) return <section className="card"><h1>{t("inquiryNotFound", locale)}</h1><Link className="btn btn-secondary" href="/vendor/inquiries">{t("inquiries", locale)}</Link></section>;
  const activeInquiry = inquiry;
  const vendor = vendors.find((item) => item.id === inquiry.vendorId);
  function save(nextStatus: "Responded" | "Confirmed" | "Declined") {
    if (nextStatus !== "Declined" && !response.trim()) { setStatus("error"); setError(t("responseRequired", locale)); setMessage(t("fixFields", locale)); return; }
    setError(""); setStatus("loading"); setMessage("");
    window.setTimeout(() => { setInquiryStatus(activeInquiry.id, nextStatus, response.trim() || undefined, "vendor"); setStatus("success"); setMessage(nextStatus === "Confirmed" ? t("feeCreatedAfterConfirm", locale) : t("responseSaved", locale)); }, 260);
  }
  return <div className="page-stack"><div className="breadcrumbs"><Link href="/vendor/inquiries">{t("inquiries", locale)}</Link><span aria-hidden="true">/</span><span>{inquiry.id}</span></div>
    <section className="card inquiry-detail-card"><div className="card-title-row"><div><p className="eyebrow">{t("inquiryDetail", locale)} · {vendor?.name}</p><h1>{inquiry.customer}</h1></div><StatusBadge status={inquiry.status} locale={locale} /></div><div className="detail-facts"><span><CalendarDays size={15} aria-hidden="true" />{formatDate(inquiry.eventDate, locale)}</span><span><BriefcaseBusiness size={15} aria-hidden="true" />{localCategory(vendor?.category || "", locale)}</span></div><section className="response-box"><h2>{t("requestDetails", locale)}</h2><p>{inquiry.detail}</p></section>
      <FormState status={status} locale={locale} message={message}><form className="response-form" onSubmit={(event) => { event.preventDefault(); save("Responded"); }} noValidate><label className="label" htmlFor="vendor-response">{t("response", locale)} <span aria-hidden="true">*</span></label><textarea id="vendor-response" className={`field textarea ${error ? "field-error" : ""}`} value={response} onChange={(event) => { setResponse(event.target.value); if (error) setError(""); }} placeholder={t("responsePlaceholder", locale)} aria-invalid={!!error} aria-describedby={error ? "vendor-response-error" : undefined} />{error && <p className="field-error-text" id="vendor-response-error">{error}</p>}<div className="form-actions"><button className="btn btn-secondary" type="submit" disabled={status === "loading"}>{t("respond", locale)}</button><button className="btn btn-primary" type="button" disabled={status === "loading"} onClick={() => save("Confirmed")}>{t("confirmInquiry", locale)}</button><button className="btn btn-danger" type="button" disabled={status === "loading"} onClick={() => save("Declined")}>{t("declineInquiry", locale)}</button></div><p className="small-note">{t("feeTimingHint", locale)}</p></form></FormState>
    </section>
  </div>;
}

export function VendorFeeStatements() {
  const { locale, fees, previewVendorId } = useDemo();
  const loading = useListLoading();
  const [statusFilter, setStatusFilter] = useState("");
  const mine = fees.filter((fee) => fee.vendorId === previewVendorId).filter((fee) => !statusFilter || fee.status === statusFilter);
  return <div className="page-stack"><Heading title={t("feeStatements", locale)} description={t("sampleStatementsHelp", locale)} /><DemoNotice />
    <div className="list-filters"><label className="label" htmlFor="fee-status">{t("feeStatus", locale)}</label><select id="fee-status" className="field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">{t("all", locale)}</option>{["Outstanding", "Paid", "Waived"].map((value) => <option key={value} value={value}>{t(value.toLowerCase(), locale)}</option>)}</select></div>
    <ListState locale={locale} items={mine.length} loading={loading} noResults={Boolean(statusFilter)} emptyKey="noFees"><div className="stacked-list">{mine.map((fee) => <article className="card fee-row" key={fee.id}><div><p className="eyebrow">{t("sample", locale)} · {formatDate(fee.date, locale)}</p><h2>{t("feeStatement", locale)} · {fee.id}</h2><p className="muted">{t("inquiry", locale)} {fee.inquiryId}</p></div><div className="fee-row-side"><StatusBadge status={fee.status} locale={locale} /><strong>{formatETB(fee.amount, locale)}</strong><Link className="btn btn-secondary" href={`/vendor/fee-statements/${fee.id}`}>{t("viewDetails", locale)}</Link></div></article>)}</div></ListState>
  </div>;
}
export function VendorFeeStatementDetail({ statementId }: { statementId: string }) {
  const { locale, fees, inquiries, vendors, previewVendorId } = useDemo();
  const fee = fees.find((item) => item.id === statementId && item.vendorId === previewVendorId);
  if (!fee) return <section className="card"><DemoNotice /><h1>{t("feeNotFound", locale)}</h1><Link className="btn btn-secondary" href="/vendor/fee-statements">{t("feeStatements", locale)}</Link></section>;
  const inquiry = inquiries.find((item) => item.id === fee.inquiryId);
  return <div className="page-stack"><div className="breadcrumbs"><Link href="/vendor/fee-statements">{t("feeStatements", locale)}</Link><span aria-hidden="true">/</span><span>{fee.id}</span></div><DemoNotice />
    <section className="card fee-detail-card"><div className="card-title-row"><div><p className="eyebrow">{t("sample", locale)} · {t("feeStatement", locale)}</p><h1>{fee.id}</h1></div><StatusBadge status={fee.status} locale={locale} /></div><dl className="detail-list"><div><dt>{t("vendor", locale)}</dt><dd>{vendors.find((item) => item.id === fee.vendorId)?.name || "—"}</dd></div><div><dt>{t("inquiry", locale)}</dt><dd>{inquiry?.id || fee.inquiryId}</dd></div><div><dt>{t("date", locale)}</dt><dd>{formatDate(fee.date, locale)}</dd></div><div><dt>{t("feeAmount", locale)}</dt><dd>{formatETB(fee.amount, locale)}</dd></div></dl><p className="inline-notice">{t("demoNotice", locale)} · {t("sampleStatement", locale)}</p><Link className="btn btn-secondary" href="/vendor/fee-statements"><ArrowLeft size={15} aria-hidden="true" />{t("back", locale)}</Link></section>
  </div>;
}


export function VendorSignInPreview() {
  const { locale, setRole } = useDemo();
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("0911000000");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "phone") {
      if (!/^(?:09\d{8}|\+2519\d{8})$/.test(phone.replace(/\s/g, ""))) { setError(t("vPhoneError", locale)); setStatus("error"); setMessage(t("fixFields", locale)); return; }
      setError(""); setStatus("loading"); setMessage("");
      window.setTimeout(() => { setStep("otp"); setStatus("success"); setMessage(t("vDemoOtpNote", locale)); }, 240);
      return;
    }
    if (otp !== "246810") { setError(t("vOtpError", locale)); setStatus("error"); setMessage(t("failedTry", locale)); return; }
    setError(""); setStatus("loading"); setMessage("");
    window.setTimeout(() => { setRole("vendor"); setStatus("success"); setMessage(t("vSignInSuccess", locale)); window.setTimeout(() => router.push("/vendor"), 250); }, 240);
  }
  return <div className="page-stack narrow-form"><Heading title={t("vSignInTitle", locale)} description={t("vSignInDescription", locale)} />
    <FormState status={status} locale={locale} message={message}><form className="card form-card" onSubmit={send} noValidate>
      {step === "phone" ? <><label className="label" htmlFor="vendor-phone">{t("vPhoneLabel", locale)}</label><input id="vendor-phone" className={`field ${error ? "field-error" : ""}`} type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={!!error} aria-describedby={error ? "vendor-phone-error" : undefined} />{error && <p id="vendor-phone-error" className="field-error-text">{error}</p>}<p className="small-note">{t("vSignInDescription", locale)}</p><button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("vContinue", locale)} <ArrowRight size={15} aria-hidden="true" /></button></> : <><label className="label" htmlFor="vendor-otp">{t("vOtpLabel", locale)}</label><input id="vendor-otp" className={`field ${error ? "field-error" : ""}`} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} aria-invalid={!!error} aria-describedby={error ? "vendor-otp-error" : "vendor-demo-otp-note"} />{error && <p id="vendor-otp-error" className="field-error-text">{error}</p>}<p id="vendor-demo-otp-note" className="inline-notice">{t("vDemoOtpNote", locale)} <strong>{t("vOtpExample", locale)}</strong></p><div className="form-actions"><button className="btn btn-secondary" type="button" onClick={() => { setStep("phone"); setStatus("idle"); setMessage(""); setError(""); }}>{t("back", locale)}</button><button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("vVerify", locale)}</button></div></>}
    </form></FormState>
  </div>;
}

export function AdminRevenueScreen() {
  const { locale, fees, vendors } = useDemo();
  const loading = useListLoading();
  const outstanding = fees.filter((fee) => fee.status === "Outstanding").reduce((sum, fee) => sum + fee.amount, 0);
  const collected = fees.filter((fee) => fee.status === "Paid").reduce((sum, fee) => sum + fee.amount, 0);
  const total = fees.reduce((sum, fee) => sum + fee.amount, 0);
  return <div className="page-stack"><Heading title={t("adminRevenueTitle", locale)} description={t("adminRevenueDescription", locale)} /><DemoNotice />
    <div className="stats-grid"><article className="card stat-card"><span>{t("revenueBilled", locale)}</span><strong>{formatETB(total, locale)}</strong><CircleDollarSign aria-hidden="true" /></article><article className="card stat-card"><span>{t("revenueCollected", locale)}</span><strong>{formatETB(collected, locale)}</strong><CheckCircle2 aria-hidden="true" /></article><article className="card stat-card"><span>{t("revenueOutstanding", locale)}</span><strong>{formatETB(outstanding, locale)}</strong><CircleDollarSign aria-hidden="true" /></article></div>
    <ListState locale={locale} items={fees.length} loading={loading} noResults={false} emptyKey="noFees"><div className="stacked-list">{fees.map((fee) => <article className="card fee-row" key={fee.id}><div><p className="eyebrow">{t("sample", locale)} · {formatDate(fee.date, locale)}</p><h2>{t("feeStatement", locale)} · {fee.id}</h2><p className="muted">{vendors.find((item) => item.id === fee.vendorId)?.name || t("vendor", locale)} · {t("inquiry", locale)} {fee.inquiryId}</p></div><div className="fee-row-side"><StatusBadge status={fee.status} locale={locale} /><strong>{formatETB(fee.amount, locale)}</strong></div></article>)}</div></ListState>
  </div>;
}
