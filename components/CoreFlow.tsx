"use client";

import { Link, useRouter } from "@/lib/nav";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Grid2X2, List, MapPin, Search, ShieldAlert, Users, X } from "lucide-react";
import { mockVenues, type Venue } from "@/lib/mock-data";
import { useDemo } from "@/lib/store";
import { formatDate, formatETB, formatMonthYear, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { FormState, ListState, type FormStatus } from "@/components/StatePatterns";
import { StatusBadge } from "@/components/StatusBadge";
import { amenityLabel, useVenueFilters, venueTypeLabel } from "@/lib/venues";
import { venueImage } from "@/lib/images";

export function useDemoLoading() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 220); return () => window.clearTimeout(timer); }, []);
  return loading;
}
function PageHeading({ kicker, title, description }: { kicker?: string; title: string; description?: string }) {
  const { locale } = useDemo();
  return <header className="page-heading"><div className="eyebrow">{kicker || t("homeKicker", locale)}</div><h1>{title}</h1>{description && <p>{description}</p>}</header>;
}
export function VenueCard({ venue }: { venue: Venue }) {
  const { locale } = useDemo();
  return <article className="venue-card card">
    <Link href={`/venues/${venue.id}`} className="venue-image-link" aria-label={`${t("viewDetails", locale)}: ${venue.name}`}>
      <img className="venue-image" src={venueImage(venue)} alt={`${venue.area} event venue`} loading="lazy" />
      <span className="photo-chip"><MapPin size={13} aria-hidden="true" />{venue.area}</span>
    </Link>
    <div className="venue-card-body">
      <div className="card-title-row"><div><p className="eyebrow">{venueTypeLabel(venue.type, locale)}</p><h2><Link href={`/venues/${venue.id}`}>{venue.name}</Link></h2></div><span className="rating">★ {Number(venue.rating ?? 0).toFixed(1)}</span></div>
      <p className="muted line-clamp-2">{venue.description}</p>
      <div className="venue-facts"><span><Users size={15} aria-hidden="true" />{formatNumber(venue.capacity, locale)} {t("guests", locale)}</span><span>{t("startingAt", locale)} <strong>{formatETB(venue.price, locale)}</strong></span></div>
      <div className="tag-list">{venue.amenities.slice(0, 3).map((amenity) => <span className="tag" key={amenity}>{amenityLabel(amenity, locale)}</span>)}</div>
      <Link className="text-link" href={`/venues/${venue.id}`}>{t("viewDetails", locale)} <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  </article>;
}

export function VenueBrowser() {
  const { locale, venues, bookings } = useDemo();
  const loading = useDemoLoading();
  const [view, setView] = useState<"grid" | "list">("grid");
  const { query, setQuery, area, setArea, date, setDate, capacity, setCapacity, minimum, setMinimum, maximum, setMaximum, type, setType, amenity, setAmenity, areas, types, amenities, filtered, hasFilter, clear } = useVenueFilters(venues, bookings);
  return <div className="page-stack">
    <PageHeading title={t("latestVenues", locale)} description={t("homeDescription", locale)} />
    <div className="discovery-layout">
      <aside className="filter-panel card" aria-label={t("ariaFilters", locale)}>
        <h2><Search size={18} aria-hidden="true" />{t("filters", locale)}</h2>
        <label className="label" htmlFor="venue-search">{t("search", locale)}</label>
        <div className="search-field"><Search size={16} aria-hidden="true" /><input id="venue-search" className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder", locale)} /></div>
        <label className="label" htmlFor="filter-area">{t("filterByArea", locale)}</label>
        <select id="filter-area" className="field" value={area} onChange={(e) => setArea(e.target.value)}><option value="">{t("allAreas", locale)}</option>{areas.map((value) => <option key={value}>{value}</option>)}</select>
        <label className="label" htmlFor="filter-date">{t("filterByDate", locale)}</label><input id="filter-date" className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label className="label" htmlFor="filter-capacity">{t("filterByCapacity", locale)}</label><input id="filter-capacity" className="field" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder={t("minCapacity", locale)} />
        <div className="field-pair"><div><label className="label" htmlFor="filter-min">{t("minPrice", locale)}</label><input id="filter-min" className="field" type="number" min="0" value={minimum} onChange={(e) => setMinimum(e.target.value)} /></div><div><label className="label" htmlFor="filter-max">{t("maxPrice", locale)}</label><input id="filter-max" className="field" type="number" min="0" value={maximum} onChange={(e) => setMaximum(e.target.value)} /></div></div>
        <label className="label" htmlFor="filter-type">{t("filterByType", locale)}</label><select id="filter-type" className="field" value={type} onChange={(e) => setType(e.target.value)}><option value="">{t("allTypes", locale)}</option>{types.map((value) => <option key={value} value={value}>{venueTypeLabel(value, locale)}</option>)}</select>
        <label className="label" htmlFor="filter-amenity">{t("filterByAmenities", locale)}</label><select id="filter-amenity" className="field" value={amenity} onChange={(e) => setAmenity(e.target.value)}><option value="">{t("all", locale)}</option>{amenities.map((value) => <option key={value} value={value}>{amenityLabel(value, locale)}</option>)}</select>
        <button className="btn btn-secondary full-width" type="button" onClick={clear}><X size={15} aria-hidden="true" />{t("clearFilters", locale)}</button>
      </aside>
      <section className="results-section" aria-labelledby="venue-results-title">
        <div className="results-toolbar"><div><p className="eyebrow">{t("results", locale)}</p><h2 id="venue-results-title">{formatNumber(filtered.length, locale)} <span className="muted">{t("venues", locale)}</span></h2></div><div className="view-toggle" role="group" aria-label={t("listView", locale)}><button type="button" aria-pressed={view === "grid"} aria-label={t("gridView", locale)} onClick={() => setView("grid")}><Grid2X2 size={17} aria-hidden="true" /></button><button type="button" aria-pressed={view === "list"} aria-label={t("listView", locale)} onClick={() => setView("list")}><List size={18} aria-hidden="true" /></button></div></div>
        <ListState locale={locale} items={filtered.length} loading={loading} noResults={hasFilter} emptyKey="emptyVenues">
          <div className={view === "grid" ? "venue-grid" : "venue-list"}>{filtered.map((venue, index) => <VenueCard key={`${venue.id}-${index}`} venue={venue} />)}</div>
        </ListState>
      </section>
    </div>
  </div>;
}

export type VenueCalendarSlotProps = { selectedDate: string; onSelectDate: (date: string) => void; heldDates: string[]; venueId: string };
export function VenueDetails({ venueId, calendar }: { venueId: string; calendar?: (props: VenueCalendarSlotProps) => React.ReactNode }) {
  const { locale, bookings, venues, vendors, customers, contactVenueAfterDeposit } = useDemo();
  const customerName = customers.find((item) => item.id === "customer-1")?.name || "Hana Bekele";
  const router = useRouter();
  const venue = venues.find((item) => item.id === venueId) || venues[0] || mockVenues[0];
  const [selectedDate, setSelectedDate] = useState("");
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const heldDates = bookings.filter((b) => b.venueId === venue.id && (b.status === "Reserved" || b.status === "Confirmed")).map((b) => b.eventDate);
  const depositPaid = bookings.some((b) => b.venueId === venue.id && b.customer === customerName && (b.status === "Reserved" || b.status === "Confirmed" || b.status === "Completed"));
  const canRevealContact = !contactVenueAfterDeposit || depositPaid;
  return <div className="page-stack">
    <div className="breadcrumbs"><Link href="/venues">{t("venues", locale)}</Link><span aria-hidden="true">/</span><span>{venue.name}</span></div>
    <div className="detail-hero">
      <img src={venueImage(venue)} alt={`${venue.area} venue`} />
      <div className="detail-hero-caption"><span className="eyebrow">{venueTypeLabel(venue.type, locale)}</span><h1>{venue.name}</h1><p><MapPin size={16} aria-hidden="true" />{venue.area}, Addis Ababa</p></div>
    </div>
    <div className="detail-columns">
      <div className="page-stack">
        <section className="card"><h2>{t("description", locale)}</h2><p>{venue.description}</p><div className="key-facts"><span><Users size={17} aria-hidden="true" />{formatNumber(venue.capacity, locale)} {t("capacity", locale)}</span><span>★ {venue.rating.toFixed(1)} / 5</span><span>{t("startingAt", locale)} {formatETB(venue.price, locale)}</span></div></section>
        <section className="card"><h2>{t("amenities", locale)}</h2><div className="tag-list">{venue.amenities.map((value) => <span className="tag" key={value}>{amenityLabel(value, locale)}</span>)}</div></section>
        <section className="card"><h2>{t("packages", locale)}</h2><div className="package-grid">{venue.packages.map((item) => <article className="package-card" key={item.name}><h3>{item.name}</h3><p>{item.description}</p><strong>{formatETB(item.price, locale)}</strong><button className="btn btn-secondary full-width" type="button" onClick={() => { setSelectedDate(""); router.push(`/bookings/new?venue=${venue.id}&package=${encodeURIComponent(item.name)}`); }}>{t("requestBooking", locale)}</button></article>)}</div></section>
        <section className="card"><h2>{t("mapPlaceholder", locale)}</h2><div className="map-placeholder"><MapPin size={24} aria-hidden="true" /><span>{venue.area}, Addis Ababa</span>{venue.mapLink && <a className="text-link" href={venue.mapLink} target="_blank" rel="noreferrer">{t("openMap", locale)}</a>}</div></section>
        <section className="card"><h2>{t("policies", locale)}</h2><p>{venue.policies || t("dateRule", locale)}</p><p>{t("maskedContact", locale)}</p></section><section className="card"><h2>{t("gallery", locale)}</h2>{venue.photos?.length ? <div className="vendor-gallery">{venue.photos.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`${venue.name} gallery ${index + 1}`} loading="lazy" />)}</div> : <p className="muted">{t("sampleGalleryNote", locale)}</p>}{venue.videos?.length ? <ul>{venue.videos.map((video, index) => <li key={`${video}-${index}`}><a href={video} target="_blank" rel="noreferrer">{t("videoLink", locale)} {formatNumber(index + 1, locale)}</a></li>)}</ul> : null}</section><section className="card"><h2>{t("contactInfo", locale)}</h2><p>{canRevealContact ? (venue.contact || t("sampleVenueContact", locale)) : t("contactHiddenVenue", locale)}</p></section>
        <section className="card"><h2>{t("suggestions", locale)}</h2><div className="vendor-suggestions">{vendors.filter((vendor) => vendor.status === "Active").slice(0, 3).map((vendor) => <Link className="suggested-vendor" key={vendor.id} href={`/vendors/${vendor.id}`}><span className="avatar-dot">{vendor.name.charAt(0)}</span><span><strong>{vendor.name}</strong><small>{vendor.category} · {vendor.area}</small></span><ArrowRight size={16} aria-hidden="true" /></Link>)}</div></section>
      </div>
      <aside className="card availability-panel"><h2><CalendarDays size={18} aria-hidden="true" />{t("availability", locale)}</h2>{calendar ? calendar({ selectedDate, onSelectDate: setSelectedDate, heldDates, venueId: venue.id }) : <><p className="muted">{formatMonthYear(monthStart, locale)}</p><div className="date-grid" role="group" aria-label={t("availability", locale)}>{Array.from({ length: monthDays }, (_, i) => { const day = i + 1; const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const held = heldDates.includes(date); return <button key={date} type="button" className={`date-cell ${held ? "is-held" : ""}`} disabled={held || date < today.toISOString().slice(0, 10)} aria-label={`${formatDate(date, locale)}${held ? ` — ${t("reserved", locale)}` : ""}`} aria-pressed={selectedDate === date} onClick={() => setSelectedDate(date)}>{day}</button>; })}</div><p className="availability-legend"><span className="legend-dot open" />{t("dateOpen", locale)} <span className="legend-dot held" />{t("reserved", locale)}</p></>}<p className="muted">{t("dateRule", locale)}</p>{selectedDate && <button type="button" className="btn btn-primary full-width" onClick={() => router.push(`/bookings/new?venue=${venue.id}&date=${selectedDate}`)}>{t("requestBooking", locale)} · {formatDate(selectedDate, locale)}</button>}
        <p className="small-note"><ShieldAlert size={14} aria-hidden="true" />{t("demoNotice", locale)}</p>
      </aside>
    </div>
  </div>;
}

export function BookingRequestForm() {
  const { locale, venues, customers, createBooking, isDateHeld } = useDemo();
  const router = useRouter(); const params = useSearchParams();
  const venue = venues.find((v) => v.id === params.get("venue")) || venues[0] || mockVenues[0];
  const [customerName, setCustomerName] = useState(customers.find((item) => item.id === "customer-1")?.name || "Hana Bekele");
  const [eventDate, setEventDate] = useState(params.get("date") || "");
  const [guests, setGuests] = useState("");
  const [packageName, setPackageName] = useState(params.get("package") || venue.packages[0].name);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle"); const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next: Record<string, string> = {};
    if (!customerName.trim()) next.customer = t("enterName", locale);
    if (!eventDate) next.date = t("dateRequired", locale);
    else if (eventDate < new Date().toISOString().slice(0, 10)) next.date = t("futureDate", locale);
    else if (isDateHeld(venue.id, eventDate)) next.date = t("dateError", locale);
    const guestCount = Number(guests); if (!guests || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > venue.capacity) next.guests = t("guestsError", locale);
    if (!packageName) next.package = t("packageRequired", locale);
    setErrors(next);
    if (Object.keys(next).length) { setStatus("error"); setMessage(t("fixFields", locale)); return; }
    setStatus("loading"); setMessage("");
    window.setTimeout(() => {
      const chosen = venue.packages.find((item) => item.name === packageName) || venue.packages[0];
      const booking = createBooking({ venueId: venue.id, customer: customerName.trim(), eventDate, guests: guestCount, packageName, notes: notes.trim(), total: chosen.price, deposit: Math.round(chosen.price * 0.25) });
      setStatus("success"); setMessage(t("bookingSubmitted", locale));
      window.setTimeout(() => router.push(`/bookings/submitted?booking=${booking.id}`), 350);
    }, 320);
  }
  return <div className="page-stack narrow-form">
    <PageHeading title={t("bookingRequest", locale)} description={venue.name} />
    <div className="booking-layout">
      <FormState status={status} locale={locale} message={message}>
        <form className="card form-card" onSubmit={onSubmit} noValidate>
          <div className="form-section"><h2>{t("eventDetails", locale)}</h2>
            <label className="label" htmlFor="booking-customer">{t("fullName", locale)} <span aria-hidden="true">*</span></label><input id="booking-customer" className={`field ${errors.customer ? "field-error" : ""}`} value={customerName} onChange={(e) => { setCustomerName(e.target.value); setErrors((v) => ({ ...v, customer: "" })); }} aria-invalid={Boolean(errors.customer)} aria-describedby={errors.customer ? "customer-error" : undefined} />{errors.customer && <p id="customer-error" className="field-error-text">{errors.customer}</p>}
            <label className="label" htmlFor="booking-date">{t("eventDateLabel", locale)} <span aria-hidden="true">*</span></label><input id="booking-date" className={`field ${errors.date ? "field-error" : ""}`} type="date" min={new Date().toISOString().slice(0, 10)} value={eventDate} onChange={(e) => { setEventDate(e.target.value); setErrors((v) => ({ ...v, date: "" })); }} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "date-error" : "date-help"} />{errors.date && <p id="date-error" className="field-error-text">{errors.date}</p>}<p id="date-help" className="field-help">{t("dateRule", locale)}</p>
            <label className="label" htmlFor="booking-guests">{t("guestLabel", locale)} <span aria-hidden="true">*</span></label><input id="booking-guests" className={`field ${errors.guests ? "field-error" : ""}`} type="number" min="1" max={venue.capacity} value={guests} onChange={(e) => { setGuests(e.target.value); setErrors((v) => ({ ...v, guests: "" })); }} aria-invalid={Boolean(errors.guests)} aria-describedby={errors.guests ? "guests-error" : undefined} />{errors.guests && <p id="guests-error" className="field-error-text">{errors.guests}</p>}
            <label className="label" htmlFor="booking-package">{t("package", locale)} <span aria-hidden="true">*</span></label><select id="booking-package" className={`field ${errors.package ? "field-error" : ""}`} value={packageName} onChange={(e) => { setPackageName(e.target.value); setErrors((v) => ({ ...v, package: "" })); }} aria-invalid={Boolean(errors.package)}>{venue.packages.map((item) => <option key={item.name} value={item.name}>{item.name} — {formatETB(item.price, locale)}</option>)}</select>{errors.package && <p className="field-error-text">{errors.package}</p>}
            <label className="label" htmlFor="booking-notes">{t("notes", locale)}</label><textarea id="booking-notes" className="field textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder", locale)} />
          </div>
          <div className="form-actions"><Link className="btn btn-secondary" href={`/venues/${venue.id}`}>{t("cancel", locale)}</Link><button className="btn btn-primary" type="submit" data-tg-primary disabled={status === "loading"}>{status === "loading" ? t("saving", locale) : t("submit", locale)} <ArrowRight size={16} aria-hidden="true" /></button></div>
          <p className="small-note">{t("noBackend", locale)}</p>
        </form>
      </FormState>
      <aside className="card booking-summary"><h2>{t("bookingSummary", locale)}</h2><img className="summary-image" src={venueImage(venue)} alt={`${venue.area} venue`} /><h3>{venue.name}</h3><p><MapPin size={15} aria-hidden="true" />{venue.area}</p><dl><div><dt>{t("package", locale)}</dt><dd>{packageName}</dd></div><div><dt>{t("date", locale)}</dt><dd>{eventDate ? formatDate(eventDate, locale) : "—"}</dd></div><div><dt>{t("guests", locale)}</dt><dd>{guests || "—"}</dd></div><div><dt>{t("amount", locale)}</dt><dd>{formatETB(venue.packages.find((item) => item.name === packageName)?.price || venue.price, locale)}</dd></div></dl><p className="muted">{t("availabilityHint", locale)}</p></aside>
    </div>
  </div>;
}

export function BookingSubmitted() {
  const { locale, bookings, venues } = useDemo(); const params = useSearchParams(); const router = useRouter();
  const booking = bookings.find((b) => b.id === params.get("booking"));
  return <div className="page-stack narrow-form"><div className="success-hero"><span className="success-mark"><Check size={25} aria-hidden="true" /></span><p className="eyebrow">{t("bookingSubmitted", locale)}</p><h1>{t("bookingRequest", locale)}</h1><p>{t("requested", locale)} · {booking?.id || "—"}</p></div>
    {booking && <div className="card booking-summary"><h2>{t("bookingSummary", locale)}</h2><p>{venues.find((v) => v.id === booking.venueId)?.name}</p><p>{formatDate(booking.eventDate, locale)} · {formatNumber(booking.guests, locale)} {t("guests", locale)}</p><StatusBadge status={booking.status} locale={locale} /><p>{t("dateRule", locale)}</p><div className="form-actions"><Link className="btn btn-secondary" href="/venues">{t("venues", locale)}</Link><button className="btn btn-primary" type="button" data-tg-primary onClick={() => router.push(`/payments/deposit?booking=${booking.id}`)}>{t("payDeposit", locale)} <ArrowRight size={16} aria-hidden="true" /></button></div></div>}
  </div>;
}

export function PaymentScreen({ receiptOnly = false }: { receiptOnly?: boolean }) {
  const demo = useDemo(); const { locale, bookings, payments, venues } = demo; const params = useSearchParams(); const router = useRouter();
  const booking = bookings.find((b) => b.id === params.get("booking"));
  const payment = payments.find((p) => p.bookingId === booking?.id);
  const outcomeParam = params.get("outcome");
  const outcome = outcomeParam || (payment?.status === "Success" ? "success" : payment?.status === "Pending" ? "pending" : payment?.status === "Failure" ? "failure" : null);
  const [status, setStatus] = useState<FormStatus>("idle"); const [message, setMessage] = useState("");
  const venue = venues.find((v) => v.id === booking?.venueId);
  function simulate() {
    if (!booking) { setStatus("error"); setMessage(t("loadError", locale)); return; }
    setStatus("loading"); setMessage("");
    window.setTimeout(() => {
      const result = demo.simulatePayment(booking.id);
      const outcomePath = result.outcome === "success" ? "/payments/success" : "/payments/failed";
      setStatus("success"); setMessage(result.outcome === "success" ? t("paymentSuccessText", locale) : result.outcome === "pending" ? t("paymentPendingText", locale) : t("paymentFailedText", locale));
      window.setTimeout(() => router.push(`${outcomePath}?booking=${booking.id}&payment=${result.payment.id}&outcome=${result.outcome}`), 450);
    }, 300);
  }
  const isResult = receiptOnly || Boolean(outcomeParam);
  const resultCopy = outcome === "success" ? t("paymentSuccessText", locale) : outcome === "pending" ? t("paymentPendingText", locale) : outcome === "failure" ? t("paymentFailedText", locale) : "";
  const resolvedPayment = params.get("payment") ? payments.find((p) => p.id === params.get("payment")) : payment;
  return <div className="page-stack narrow-form">
    <PageHeading title={isResult ? t("receipt", locale) : t("paymentMethod", locale)} description={t("demoNotice", locale)} />
    <div className="persistent-demo-notice" role="note"><ShieldAlert size={18} aria-hidden="true" /><strong>{t("demoNotice", locale)}</strong><span>{t("noTransactions", locale)}</span></div>
    <FormState status={status} locale={locale} message={message}>
      <section className="card payment-card">
        <div className="payment-heading"><span className="payment-symbol">ETB</span><div><p className="eyebrow">{t("simulationOnly", locale)}</p><h2>{isResult ? (outcome === "success" ? t("success", locale) : outcome === "pending" ? t("pending", locale) : outcome === "failure" ? t("failure", locale) : t("receipt", locale)) : t("telebirr", locale)}</h2></div></div>
        {booking ? <dl className="summary-dl"><div><dt>{t("venue", locale)}</dt><dd>{venue?.name || "—"}</dd></div><div><dt>{t("date", locale)}</dt><dd>{formatDate(booking.eventDate, locale)}</dd></div><div><dt>{t("bookingStatus", locale)}</dt><dd><StatusBadge status={booking.status} locale={locale} /></dd></div><div><dt>{t("depositDue", locale)}</dt><dd>{formatETB(booking.deposit, locale)}</dd></div></dl> : <p>{t("loadError", locale)}</p>}
        {isResult && <div className={`outcome-message ${outcome === "success" ? "success-message" : outcome === "failure" ? "error-message" : "pending-message"}`} role="status">{outcome === "success" ? <Check size={18} aria-hidden="true" /> : outcome === "failure" ? <X size={18} aria-hidden="true" /> : <Clock3 size={18} aria-hidden="true" />}<p>{resultCopy || t("noTransactions", locale)}</p></div>}
        {isResult && <p className="sample-stamp">{t("sampleReceipt", locale)} · {t("sample", locale)}</p>}
        {!isResult && <><p className="field-help">{t("paymentSelect", locale)}: <StatusBadge status={demo.paymentOutcome === "success" ? "Success" : demo.paymentOutcome === "pending" ? "Pending" : "Failure"} locale={locale} /></p><p className="muted">{t("noCredentials", locale)} {t("noTransactions", locale)}</p><div className="form-actions"><Link className="btn btn-secondary" href={`/bookings/submitted?booking=${booking?.id || ""}`}>{t("back", locale)}</Link><button type="button" className="btn btn-primary" data-tg-primary onClick={simulate} disabled={status === "loading" || !booking}>{status === "loading" ? t("saving", locale) : t("payDeposit", locale)} <ArrowRight size={16} aria-hidden="true" /></button></div></>}
        {isResult && <div className="form-actions">{outcome !== "success" && booking && <button className="btn btn-primary" type="button" data-tg-primary onClick={() => router.push(`/payments/deposit?booking=${booking.id}`)}>{t("retryPayment", locale)}</button>}<Link className="btn btn-secondary" href="/my-event">{t("myEvent", locale)}</Link><Link className="btn btn-secondary" href="/venues">{t("venues", locale)}</Link></div>}
      </section>
    </FormState>
    {isResult && resolvedPayment && <section className="card receipt-card"><div className="receipt-header"><h2>{t("sampleReceipt", locale)}</h2><span className="sample-stamp">{t("sample", locale)}</span></div><p>{t("demoNotice", locale)}</p><dl className="summary-dl"><div><dt>{t("booking", locale)}</dt><dd>{booking?.id}</dd></div><div><dt>{t("date", locale)}</dt><dd>{booking ? formatDate(booking.eventDate, locale) : "—"}</dd></div><div><dt>{t("paymentDate", locale)}</dt><dd>{formatDate(resolvedPayment.date, locale)}</dd></div><div><dt>{t("paymentStatus", locale)}</dt><dd><StatusBadge status={resolvedPayment.status} locale={locale} /></dd></div><div><dt>{t("amount", locale)}</dt><dd>{formatETB(resolvedPayment.amount, locale)}</dd></div></dl><p className="small-note">{t("noTransactions", locale)}</p></section>}
  </div>;
}

export function MyEventDashboard() {
  const { locale, bookings, payments, venues, customers, inquiries } = useDemo(); const customerName = customers.find((item) => item.id === "customer-1")?.name || "Hana Bekele"; const myBookings = bookings.filter((b) => b.customer === customerName); const myInquiries = inquiries.filter((item) => item.customer === customerName);
  const latest = [...myBookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  const venue = venues.find((v) => v.id === latest?.venueId);
  return <div className="page-stack"><PageHeading title={t("myEventTitle", locale)} description={t("customerDashboard", locale)} />
    <div className="stats-grid"><div className="stat-card"><span>{t("myBookings", locale)}</span><strong>{formatNumber(myBookings.length, locale)}</strong></div><div className="stat-card"><span>{t("inquiries", locale)}</span><strong>{formatNumber(myInquiries.length, locale)}</strong></div><div className="stat-card"><span>{t("payments", locale)}</span><strong>{formatNumber(payments.filter((p) => myBookings.some((b) => b.id === p.bookingId)).length, locale)}</strong></div></div>
    {latest ? <section className="card my-event-feature"><div><p className="eyebrow">{t("recentActivity", locale)}</p><h2>{venue?.name || "—"}</h2><p><CalendarDays size={16} aria-hidden="true" />{formatDate(latest.eventDate, locale)} · {formatNumber(latest.guests, locale)} {t("guests", locale)}</p><StatusBadge status={latest.status} locale={locale} /><div className="form-actions"><Link className="btn btn-primary" href={`/my-bookings/${latest.id}`}>{t("bookingDetail", locale)}</Link><Link className="btn btn-secondary" href="/my-bookings">{t("myBookings", locale)}</Link></div></div><img src={venueImage(venue)} alt={venue?.name || "Event venue"} /></section> : <div className="card"><h2>{t("noBookings", locale)}</h2><Link className="btn btn-primary" href="/venues">{t("exploreVenues", locale)}</Link></div>}
    <div className="link-card-grid"><Link className="card link-card" href="/my-inquiries"><strong>{t("myInquiries", locale)}</strong><ArrowRight size={17} aria-hidden="true" /></Link><Link className="card link-card" href="/my-payments"><strong>{t("payments", locale)}</strong><ArrowRight size={17} aria-hidden="true" /></Link><Link className="card link-card" href="/saved"><strong>{t("saved", locale)}</strong><ArrowRight size={17} aria-hidden="true" /></Link></div>
  </div>;
}

export function AdminBookings() {
  const { locale, bookings, venues } = useDemo(); const loading = useDemoLoading(); const [query, setQuery] = useState(""); const [statusFilter, setStatusFilter] = useState("");
  const filtered = bookings.filter((b) => `${b.id} ${b.customer} ${venues.find((v) => v.id === b.venueId)?.name}`.toLowerCase().includes(query.toLowerCase()) && (!statusFilter || b.status === statusFilter));
  const noResults = Boolean(query || statusFilter);
  return <div className="page-stack"><PageHeading title={t("bookingTable", locale)} description={t("adminDashboard", locale)} />
    <div className="card list-toolbar"><label className="search-field"><Search size={16} aria-hidden="true" /><input className="field" aria-label={t("searchRecords", locale)} placeholder={t("searchPlaceholder", locale)} value={query} onChange={(e) => setQuery(e.target.value)} /></label><label><span className="sr-only">{t("status", locale)}</span><select className="field" aria-label={t("status", locale)} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">{t("allStatuses", locale)}</option>{["Requested", "Reserved", "Confirmed", "Completed", "Canceled"].map((s) => <option key={s} value={s}>{t(s.toLowerCase(), locale)}</option>)}</select></label><Link className="btn btn-primary" href="/admin/bookings/new">{t("manualBooking", locale)}</Link></div>
    <ListState locale={locale} items={filtered.length} loading={loading} noResults={noResults} emptyKey="noBookings">
      <div className="responsive-table"><table><thead><tr><th>{t("booking", locale)}</th><th>{t("customer", locale)}</th><th>{t("venue", locale)}</th><th>{t("date", locale)}</th><th>{t("source", locale)}</th><th>{t("status", locale)}</th><th>{t("action", locale)}</th></tr></thead><tbody>{filtered.map((b) => <tr key={b.id}><td data-label={t("booking", locale)}><strong>{b.id}</strong></td><td data-label={t("customer", locale)}>{b.customer}</td><td data-label={t("venue", locale)}>{venues.find((v) => v.id === b.venueId)?.name}</td><td data-label={t("date", locale)}>{formatDate(b.eventDate, locale)}</td><td data-label={t("source", locale)}><span className="tag">{t(b.source.toLowerCase(), locale)}</span></td><td data-label={t("status", locale)}><StatusBadge status={b.status} locale={locale} /></td><td data-label={t("action", locale)}><Link className="text-link" href={`/admin/bookings/${b.id}`}>{t("viewDetails", locale)} <ArrowRight size={14} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>
    </ListState>
  </div>;
}

export function AdminBookingDetail({ bookingId }: { bookingId: string }) {
  const { locale, bookings, venues, payments, setBookingStatus, rescheduleBooking, conflictsFor } = useDemo();
  const loading = useDemoLoading();
  const booking = bookings.find((item) => item.id === bookingId);
  const [newDate, setNewDate] = useState(booking?.eventDate || "");
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  if (!booking) return <div className="card"><h1>{t("notFound", locale)}</h1><Link href="/admin/bookings">{t("back", locale)}</Link></div>;

  const selectedBooking = booking;
  const venue = venues.find((item) => item.id === selectedBooking.venueId);
  const conflicts = conflictsFor(selectedBooking);
  const paymentHistory = payments.filter((payment) => payment.bookingId === selectedBooking.id);
  const latestPayment = paymentHistory[0];

  function action(status: "Confirmed" | "Canceled") {
    setBookingStatus(selectedBooking.id, status);
    setFormStatus("success");
    setMessage(t("statusUpdated", locale));
  }
  function submitReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    if (!newDate) { setFormStatus("error"); setMessage(t("dateRequired", locale)); return; }
    if (newDate < today) { setFormStatus("error"); setMessage(t("futureDate", locale)); return; }
    setFormStatus("loading");
    setMessage("");
    window.setTimeout(() => {
      try {
        rescheduleBooking(selectedBooking.id, newDate);
        setFormStatus("success");
        setMessage(t("statusUpdated", locale));
      } catch {
        setFormStatus("error");
        setMessage(t("actionFailed", locale));
      }
    }, 240);
  }

  return <div className="page-stack">
    <div className="breadcrumbs"><Link href="/admin/bookings">{t("bookings", locale)}</Link><span>/</span><span>{booking.id}</span></div>
    <PageHeading title={`${t("bookingDetail", locale)} · ${booking.id}`} description={venue?.name} />
    <FormState status={formStatus} locale={locale} message={message}>
      <section className="card detail-record">
        <div className="detail-record-header"><div><p className="eyebrow">{t("source", locale)} · {t(booking.source.toLowerCase(), locale)}</p><h2>{venue?.name}</h2><p>{booking.customer} · {formatDate(booking.eventDate, locale)}</p></div><StatusBadge status={booking.status} locale={locale} /></div>
        <dl className="summary-dl">
          <div><dt>{t("customer", locale)}</dt><dd>{booking.customer}</dd></div>
          <div><dt>{t("guests", locale)}</dt><dd>{formatNumber(booking.guests, locale)}</dd></div>
          <div><dt>{t("package", locale)}</dt><dd>{booking.packageName}</dd></div>
          <div><dt>{t("amount", locale)}</dt><dd>{formatETB(booking.total, locale)}</dd></div>
          <div><dt>{t("deposit", locale)}</dt><dd>{formatETB(booking.deposit, locale)}</dd></div>
          <div><dt>{t("paymentStatus", locale)}</dt><dd>{latestPayment ? <StatusBadge status={latestPayment.status} locale={locale} /> : t("noPaymentRecord", locale)}</dd></div>
        </dl>
        {booking.notes && <section className="booking-notes"><h3>{t("notes", locale)}</h3><p>{booking.notes}</p></section>}
        <section className="booking-notes">
          <h3>{t("payments", locale)} · {formatNumber(paymentHistory.length, locale)}</h3>
          <p className="small-note">{t("demoNotice", locale)}</p>
          <ListState locale={locale} items={paymentHistory.length} loading={loading} emptyKey="noPaymentRecord">
            <ul className="admin-activity-list">{paymentHistory.map((payment) => <li key={payment.id}><strong><StatusBadge status={payment.status} locale={locale} /></strong><span>{formatETB(payment.amount, locale)}</span><small>{formatDate(payment.date, locale)} · {t("sample", locale)}</small></li>)}</ul>
          </ListState>
        </section>
        {conflicts.length > 0 && <div className="conflict-alert" role="alert"><ShieldAlert size={18} aria-hidden="true" /><div><strong>{t("conflictWarning", locale)}</strong><p>{formatNumber(conflicts.length, locale)} {t("overlapFlag", locale)}.</p><p>{t("noAutoChange", locale)}</p></div></div>}
        <h3>{t("statusTimeline", locale)}</h3><div className="timeline"><span><i />{t("requested", locale)} · {formatDate(booking.createdAt, locale)}</span><span><i />{t(booking.status.toLowerCase(), locale)} · {formatDate(booking.eventDate, locale)}</span></div>
        <div className="form-actions"><Link className="btn btn-secondary" href="/admin/bookings">{t("back", locale)}</Link>{booking.status === "Reserved" && <button className="btn btn-primary" type="button" onClick={() => action("Confirmed")}>{t("approveBooking", locale)}</button>}{(booking.status === "Reserved" || booking.status === "Requested") && <button className="btn btn-danger" type="button" onClick={() => action("Canceled")}>{t("rejectBooking", locale)}</button>}{booking.status === "Confirmed" && <button className="btn btn-danger" type="button" onClick={() => action("Canceled")}>{t("cancelBooking", locale)}</button>}</div>
      </section>
      <form className="card reschedule-form" onSubmit={submitReschedule} noValidate>
        <h2>{t("reschedule", locale)}</h2>
        <label className="label" htmlFor="reschedule-date">{t("eventDateLabel", locale)}</label>
        <input id="reschedule-date" className="field" type="date" min={new Date().toISOString().slice(0, 10)} value={newDate} onChange={(event) => { setNewDate(event.target.value); setFormStatus("idle"); setMessage(""); }} />
        <button className="btn btn-secondary" type="submit" disabled={formStatus === "loading"}>{formStatus === "loading" ? t("saving", locale) : t("reschedule", locale)}</button>
        <p className="field-help">{t("adminConflictHint", locale)} {t("noAutoChange", locale)}</p>
      </form>
    </FormState>
  </div>;
}

export function AdminCalendar() {
  const { locale, bookings, venues } = useDemo(); const [selectedVenue, setSelectedVenue] = useState("");
  const items = bookings.filter((b) => !selectedVenue || b.venueId === selectedVenue).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const reserved = items.filter((b) => b.status === "Reserved" || b.status === "Confirmed");
  const requestedConflicts = items.filter((b) => b.status === "Requested" && reserved.some((held) => held.venueId === b.venueId && held.eventDate === b.eventDate));
  const overlapCount = items.reduce((n, b) => n + ((b.status === "Reserved" || b.status === "Confirmed") ? bookings.filter((other) => other.id !== b.id && other.venueId === b.venueId && other.eventDate === b.eventDate && other.status === "Requested").length : 0), 0);
  return <div className="page-stack"><PageHeading title={t("calendarOverview", locale)} description={t("calendarAgenda", locale)} />
    <div className="card list-toolbar"><label className="label" htmlFor="calendar-venue">{t("venue", locale)}</label><select id="calendar-venue" className="field" value={selectedVenue} onChange={(e) => setSelectedVenue(e.target.value)}><option value="">{t("all", locale)} {t("venues", locale)}</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
    {overlapCount > 0 && <div className="conflict-alert" role="alert"><ShieldAlert size={18} aria-hidden="true" /><div><strong>{t("conflictWarning", locale)}</strong><p>{requestedConflicts.length} {t("overlapFlag", locale)}. {t("adminConflictHint", locale)} {t("noAutoChange", locale)}</p></div></div>}
    <ListState locale={locale} items={items.length} loading={useDemoLoading()} emptyKey="noBookings"><div className="agenda-list">{items.map((b) => { const venue = venues.find((v) => v.id === b.venueId); const flagged = b.status === "Requested" && bookings.some((other) => other.venueId === b.venueId && other.eventDate === b.eventDate && (other.status === "Reserved" || other.status === "Confirmed")); return <article className={`agenda-item ${flagged ? "has-conflict" : ""}`} key={b.id}><div className="agenda-date"><strong>{formatDate(b.eventDate, locale)}</strong><span>{formatNumber(b.guests, locale)} {t("guests", locale)}</span></div><div className="agenda-body"><h3>{venue?.name} <span>· {b.customer}</span></h3><StatusBadge status={b.status} locale={locale} />{flagged && <StatusBadge status="Needs reschedule or reject" locale={locale} />}<p>{b.packageName} · {formatETB(b.total, locale)}</p></div><Link className="btn btn-secondary" href={`/admin/bookings/${b.id}`}>{t("viewDetails", locale)}</Link></article>; })}</div></ListState>
  </div>;
}
