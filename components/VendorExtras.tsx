"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Eye, Save } from "lucide-react";
import { useDemo } from "@/lib/store";
import { formatETB, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { FormState, ListState, type FormStatus } from "@/components/StatePatterns";
import { StatusBadge } from "@/components/StatusBadge";
import type { Vendor } from "@/lib/mock-data";

function useLoading() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 220); return () => window.clearTimeout(timer); }, []);
  return loading;
}
function Heading({ title, description }: { title: string; description?: string }) {
  const { locale } = useDemo();
  return <header className="page-heading"><p className="eyebrow">{t("homeKicker", locale)}</p><h1>{title}</h1>{description && <p>{description}</p>}</header>;
}
function getPreviewVendor(demo: ReturnType<typeof useDemo>) {
  return demo.vendors.find((vendor) => vendor.id === demo.previewVendorId) || demo.vendors[0];
}
function splitLines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function categoryLabel(category: string, locale: "en" | "am") {
  const key: Record<string,string> = { Photography: "categoryPhotography", Catering: "categoryCatering", Decor: "categoryDecor", "Music & sound": "categoryMusic", Beauty: "categoryBeauty", Video: "categoryVideo", Flowers: "categoryFlowers" };
  return key[category] ? t(key[category], locale) : category;
}
export function VendorApplicationForm() {
  const demo = useDemo(); const { locale } = demo; const router = useRouter();
  const [name, setName] = useState(""); const [category, setCategory] = useState(demo.categories[0] || "Photography");
  const [description, setDescription] = useState(""); const [services, setServices] = useState(""); const [price, setPrice] = useState("");
  const [area, setArea] = useState(""); const [contact, setContact] = useState(""); const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState(""); const [videos, setVideos] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle"); const [message, setMessage] = useState(""); const [errors, setErrors] = useState<Record<string,string>>({});
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next: Record<string,string> = {};
    if (!name.trim()) next.name = t("enterName", locale);
    if (!category) next.category = t("categoryRequired", locale);
    if (!description.trim()) next.description = t("messageRequired", locale);
    if (!services.trim()) next.services = t("messageRequired", locale);
    if (!price || !Number.isFinite(Number(price)) || Number(price) <= 0) next.price = t("amountError", locale);
    if (!area.trim()) next.area = t("fieldRequired", locale);
    if (!/^(?:09\d{8}|\+2519\d{8})$/.test(phone.replace(/\s/g,""))) next.phone = t("customerPhoneError", locale);
    setErrors(next); if (Object.keys(next).length) { setStatus("error"); setMessage(t("nextStepHint", locale)); return; }
    setStatus("loading"); setMessage("");
    window.setTimeout(() => {
      const vendor: Vendor = { id: `vendor-app-${Date.now()}`, name: name.trim(), category, description: description.trim(), services: services.split(",").map((value) => value.trim()).filter(Boolean), startingPrice: Number(price), area: area.trim(), contact: `${contact.trim()} · ${phone.trim()}`, media: splitLines(photos), videos: splitLines(videos), status: "Pending", applicationStatus: "Pending" };
      demo.saveVendor(vendor); demo.setPreviewVendorId(vendor.id); demo.setRole("vendor"); setStatus("success"); setMessage(t("vendorApplicationSaved", locale));
      window.setTimeout(() => router.push("/vendor/application"), 300);
    }, 280);
  }
  return <div className="page-stack narrow-form"><Heading title={t("vendorApplyTitle", locale)} description={t("vendorApplyHelp", locale)} />
    <FormState status={status} locale={locale} message={message}><form className="card form-card" onSubmit={submit} noValidate>
      <label className="label" htmlFor="apply-business">{t("vendorBusinessName", locale)} *</label><input id="apply-business" className={`field ${errors.name ? "field-error" : ""}`} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />{errors.name && <p className="field-error-text">{errors.name}</p>}
      <label className="label" htmlFor="apply-category">{t("category", locale)} *</label><select id="apply-category" className={`field ${errors.category ? "field-error" : ""}`} value={category} onChange={(e) => setCategory(e.target.value)}>{demo.categories.map((value) => <option value={value} key={value}>{categoryLabel(value, locale)}</option>)}</select>{errors.category && <p className="field-error-text">{errors.category}</p>}
      <label className="label" htmlFor="apply-description">{t("vendorDescriptionLabel", locale)} *</label><textarea id="apply-description" className={`field textarea ${errors.description ? "field-error" : ""}`} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={!!errors.description} />{errors.description && <p className="field-error-text">{errors.description}</p>}
      <label className="label" htmlFor="apply-services">{t("vendorServicesLabel", locale)} *</label><input id="apply-services" className={`field ${errors.services ? "field-error" : ""}`} value={services} onChange={(e) => setServices(e.target.value)} aria-invalid={!!errors.services} />{errors.services && <p className="field-error-text">{errors.services}</p>}
      <label className="label" htmlFor="apply-price">{t("vendorStartingPrice", locale)} *</label><input id="apply-price" className={`field ${errors.price ? "field-error" : ""}`} type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={!!errors.price} />{errors.price && <p className="field-error-text">{errors.price}</p>}
      <label className="label" htmlFor="apply-area">{t("vendorServiceArea", locale)} *</label><input id="apply-area" className={`field ${errors.area ? "field-error" : ""}`} value={area} onChange={(e) => setArea(e.target.value)} aria-invalid={!!errors.area} />{errors.area && <p className="field-error-text">{errors.area}</p>}
      <label className="label" htmlFor="apply-contact">{t("vendorContactLabel", locale)}</label><input id="apply-contact" className="field" value={contact} onChange={(e) => setContact(e.target.value)} />
      <label className="label" htmlFor="apply-phone">{t("phoneNumber", locale)} *</label><input id="apply-phone" className={`field ${errors.phone ? "field-error" : ""}`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} />{errors.phone && <p className="field-error-text">{errors.phone}</p>}
      <label className="label" htmlFor="apply-photos">{t("vendorPhotoLinks", locale)}</label><textarea id="apply-photos" className="field textarea" value={photos} onChange={(e) => setPhotos(e.target.value)} />
      <label className="label" htmlFor="apply-videos">{t("vendorVideoLinks", locale)}</label><textarea id="apply-videos" className="field textarea" value={videos} onChange={(e) => setVideos(e.target.value)} />
      <div className="form-actions"><Link className="btn btn-secondary" href="/vendors">{t("cancel", locale)}</Link><button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("vendorApplicationSubmit", locale)} <ArrowRight size={15} aria-hidden="true" /></button></div>
    </form></FormState>
  </div>;
}

export function VendorApplicationStatus() {
  const demo = useDemo(); const { locale } = demo; const vendor = getPreviewVendor(demo);
  if (!vendor) return <section className="card"><Heading title={t("vendorNotFound", locale)} /><Link className="btn btn-primary" href="/vendor/apply">{t("vendorApplyTitle", locale)}</Link></section>;
  const application = vendor.applicationStatus || (vendor.status === "Active" ? "Approved" : vendor.status === "Pending" ? "Pending" : "Rejected");
  const description = application === "Pending" ? t("vendorApplicationPendingText", locale) : application === "Needs changes" ? t("vendorApplicationNeedsChangesText", locale) : application === "Rejected" ? t("vendorApplicationRejectedText", locale) : t("vendorSaved", locale);
  return <div className="page-stack"><Heading title={t("applicationStatus", locale)} description={vendor.name} /><section className="card detail-record"><div className="card-title-row"><div><p className="eyebrow">{t("sample", locale)}</p><h2>{vendor.name}</h2><p>{categoryLabel(vendor.category, locale)} · {vendor.area}</p></div><StatusBadge status={application} locale={locale} /></div><p>{description}</p><div className="form-actions"><Link className="btn btn-primary" href="/vendor/profile">{t("vendorListingEditorTitle", locale)}</Link><Link className="btn btn-secondary" href="/vendor">{t("vendorProfileBack", locale)}</Link></div></section></div>;
}

export function VendorListingEditor() {
  const demo = useDemo(); const { locale } = demo; const source = getPreviewVendor(demo);
  const [name, setName] = useState(source?.name || ""); const [category, setCategory] = useState(source?.category || demo.categories[0] || "Photography");
  const [description, setDescription] = useState(source?.description || ""); const [services, setServices] = useState(source?.services.join(", ") || "");
  const [price, setPrice] = useState(source ? String(source.startingPrice) : ""); const [area, setArea] = useState(source?.area || ""); const [contact, setContact] = useState(source?.contact || "");
  const [photos, setPhotos] = useState(source?.media?.join("\n") || ""); const [videos, setVideos] = useState(source?.videos?.join("\n") || "");
  const [status, setStatus] = useState<FormStatus>("idle"); const [message, setMessage] = useState(""); const [errors, setErrors] = useState<Record<string,string>>({});
  useEffect(() => { if (!source) return; setName(source.name); setCategory(source.category); setDescription(source.description); setServices(source.services.join(", ")); setPrice(String(source.startingPrice)); setArea(source.area); setContact(source.contact || ""); setPhotos(source.media?.join("\n") || ""); setVideos(source.videos?.join("\n") || ""); }, [source]);
  if (!source) return <section className="card"><Heading title={t("vendorNotFound", locale)} /></section>;
  const current = source;
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next: Record<string,string> = {};
    if (!name.trim()) next.name = t("enterName", locale); if (!category) next.category = t("categoryRequired", locale); if (!description.trim()) next.description = t("messageRequired", locale); if (!services.trim()) next.services = t("messageRequired", locale); if (!price || !Number.isFinite(Number(price)) || Number(price) <= 0) next.price = t("amountError", locale); if (!area.trim()) next.area = t("fieldRequired", locale);
    setErrors(next); if (Object.keys(next).length) { setStatus("error"); setMessage(t("nextStepHint", locale)); return; }
    setStatus("loading"); setMessage(""); window.setTimeout(() => { const applicationStatus = current.applicationStatus === "Needs changes" ? "Pending" : current.applicationStatus; demo.saveVendor({ ...current, name: name.trim(), category, description: description.trim(), services: services.split(",").map((value) => value.trim()).filter(Boolean), startingPrice: Number(price), area: area.trim(), contact: contact.trim() || undefined, media: splitLines(photos), videos: splitLines(videos), applicationStatus, status: current.status }); setStatus("success"); setMessage(t("vendorSaved", locale)); }, 250);
  }
  return <div className="page-stack narrow-form"><Heading title={t("vendorListingEditorTitle", locale)} description={t("vendorListingEditorHelp", locale)} />
    <FormState status={status} locale={locale} message={message}><form className="card form-card" onSubmit={submit} noValidate>
      <label className="label" htmlFor="vendor-edit-name">{t("vendorBusinessName", locale)} *</label><input id="vendor-edit-name" className={`field ${errors.name ? "field-error" : ""}`} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />{errors.name && <p className="field-error-text">{errors.name}</p>}
      <label className="label" htmlFor="vendor-edit-category">{t("category", locale)} *</label><select id="vendor-edit-category" className="field" value={category} onChange={(e) => setCategory(e.target.value)}>{demo.categories.map((value) => <option value={value} key={value}>{categoryLabel(value, locale)}</option>)}</select>
      <label className="label" htmlFor="vendor-edit-description">{t("vendorDescriptionLabel", locale)} *</label><textarea id="vendor-edit-description" className={`field textarea ${errors.description ? "field-error" : ""}`} value={description} onChange={(e) => setDescription(e.target.value)} />{errors.description && <p className="field-error-text">{errors.description}</p>}
      <label className="label" htmlFor="vendor-edit-services">{t("vendorServicesLabel", locale)} *</label><input id="vendor-edit-services" className={`field ${errors.services ? "field-error" : ""}`} value={services} onChange={(e) => setServices(e.target.value)} />{errors.services && <p className="field-error-text">{errors.services}</p>}
      <label className="label" htmlFor="vendor-edit-price">{t("vendorStartingPrice", locale)} *</label><input id="vendor-edit-price" className={`field ${errors.price ? "field-error" : ""}`} type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />{errors.price && <p className="field-error-text">{errors.price}</p>}
      <label className="label" htmlFor="vendor-edit-area">{t("vendorServiceArea", locale)} *</label><input id="vendor-edit-area" className={`field ${errors.area ? "field-error" : ""}`} value={area} onChange={(e) => setArea(e.target.value)} />{errors.area && <p className="field-error-text">{errors.area}</p>}
      <label className="label" htmlFor="vendor-edit-contact">{t("vendorContactLabel", locale)}</label><input id="vendor-edit-contact" className="field" value={contact} onChange={(e) => setContact(e.target.value)} />
      <label className="label" htmlFor="vendor-edit-photos">{t("vendorPhotoLinks", locale)}</label><textarea id="vendor-edit-photos" className="field textarea" value={photos} onChange={(e) => setPhotos(e.target.value)} />
      <label className="label" htmlFor="vendor-edit-videos">{t("vendorVideoLinks", locale)}</label><textarea id="vendor-edit-videos" className="field textarea" value={videos} onChange={(e) => setVideos(e.target.value)} />
      <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={status === "loading"}><Save size={15} aria-hidden="true" />{t("saveChanges", locale)}</button><Link className="btn btn-secondary" href="/vendor/listing-preview"><Eye size={15} aria-hidden="true" />{t("vendorPreviewTitle", locale)}</Link></div>
    </form></FormState>
  </div>;
}

export function VendorListingPreview() {
  const demo = useDemo(); const { locale } = demo; const vendor = getPreviewVendor(demo);
  if (!vendor) return <section className="card"><Heading title={t("vendorNotFound", locale)} /></section>;
  return <div className="page-stack"><Heading title={t("vendorPreviewTitle", locale)} description={t("sampleStaticContent", locale)} /><article className="card vendor-preview-card"><p className="eyebrow">{categoryLabel(vendor.category, locale)} · {vendor.area}</p><h2>{vendor.name}</h2><p>{vendor.description}</p><div className="tag-list">{vendor.services.map((service) => <span className="tag" key={service}>{service}</span>)}</div><p>{t("startingAt", locale)} <strong>{formatETB(vendor.startingPrice, locale)}</strong></p><p>{demo.contactVendorAfterAcceptance ? t("contactHiddenVendor", locale) : (vendor.contact || t("contactDemoValue", locale))}</p>{vendor.media?.length ? <div className="vendor-gallery">{vendor.media.map((image, index) => <img src={image} alt={`${vendor.name} sample ${formatNumber(index + 1, locale)}`} key={`${image}-${index}`} />)}</div> : null}{vendor.videos?.length ? <ul>{vendor.videos.map((video, index) => <li key={`${video}-${index}`}><a href={video} target="_blank" rel="noreferrer">{t("videoLink", locale)} {formatNumber(index + 1, locale)}</a></li>)}</ul> : null}<div className="form-actions"><Link className="btn btn-secondary" href="/vendor/profile">{t("vendorListingEditorTitle", locale)}</Link><Link className="btn btn-primary" href="/vendor">{t("vendorProfileBack", locale)}</Link></div></article></div>;
}

export function VendorNotifications() {
  const { locale, inquiries, fees, previewVendorId } = useDemo(); const loading = useLoading(); const [query, setQuery] = useState("");
  const notifications = [
    ...inquiries.filter((item) => item.vendorId === previewVendorId).slice(0, 4).map((item) => ({ id: item.id, title: t("inquiries", locale), detail: `${item.customer} · ${item.eventDate}` })),
    ...fees.filter((item) => item.vendorId === previewVendorId).slice(0, 3).map((item) => ({ id: item.id, title: t("feeStatements", locale), detail: `${formatETB(item.amount, locale)} · ${item.status}` })),
  ];
  const filtered = notifications.filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><Heading title={t("notificationsTitle", locale)} description={t("sampleStaticContent", locale)} /><label className="label" htmlFor="vendor-notice-search">{t("search", locale)}</label><input id="vendor-notice-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder", locale)} />
    <ListState locale={locale} items={filtered.length} loading={loading} noResults={Boolean(query)} emptyKey="emptyNotifications"><div className="stacked-list">{filtered.map((item) => <article className="card notification-card" key={item.id}><Bell size={18} aria-hidden="true" /><div><h2>{item.title}</h2><p>{item.detail}</p><span className="tag">{t("sample", locale)}</span></div></article>)}</div></ListState>
  </div>;
}

export function VendorSettings() {
  const demo = useDemo(); const { locale } = demo; const [prefs, setPrefs] = useState(demo.notificationPreferences);
  const [status, setStatus] = useState<FormStatus>("idle"); const [message, setMessage] = useState("");
  useEffect(() => setPrefs(demo.notificationPreferences), [demo.notificationPreferences]);
  function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setStatus("loading"); setMessage(""); window.setTimeout(() => { demo.saveNotificationPreferences(prefs); setStatus("success"); setMessage(t("preferencesSaved", locale)); }, 230); }
  return <div className="page-stack narrow-form"><Heading title={t("vendorAccountSettingsTitle", locale)} description={t("accessNotice", locale)} />
    <FormState status={status} locale={locale} message={message}><form className="card form-card" onSubmit={submit}>
      <label className="label" htmlFor="vendor-language">{t("language", locale)}</label><select id="vendor-language" className="field" value={locale} onChange={(e) => demo.setLocale(e.target.value as "en" | "am")}><option value="en">{t("languageEnglish", locale)}</option><option value="am">{t("languageAmharic", locale)}</option></select>
      <fieldset className="form-section"><legend>{t("vendorNotificationSettings", locale)}</legend>{[["booking","prefBookings"],["inquiry","prefInquiries"],["payment","prefPayments"],["vendor","prefVendors"]].map(([key,label]) => <label className="checkbox-card" key={key}><input type="checkbox" checked={!!prefs[key]} onChange={(e) => setPrefs((old) => ({ ...old, [key]: e.target.checked }))} /><span>{t(label, locale)}</span></label>)}</fieldset>
      <button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("saveChanges", locale)}</button>
    </form></FormState>
  </div>;
}
