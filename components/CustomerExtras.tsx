"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, CalendarDays, CheckCircle2, CircleDollarSign, Heart, MapPin, Search, ShieldAlert, UserRound } from "lucide-react";
import { useDemo } from "@/lib/store";
import { formatDate, formatETB, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { FormState, ListState, type FormStatus } from "@/components/StatePatterns";
import { StatusBadge } from "@/components/StatusBadge";

function useLoading() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 220); return () => window.clearTimeout(timer); }, []);
  return loading;
}
function DemoPaymentNotice() {
  const { locale } = useDemo();
  return <div className="demo-notice" role="note"><ShieldAlert size={18} aria-hidden="true" /><div><strong>{t("demoNotice", locale)}</strong><p>{t("noTransactions", locale)} {t("noCredentials", locale)}</p></div></div>;
}
function customerAccount(demo: ReturnType<typeof useDemo>) {
  return demo.customers.find((item) => item.id === "customer-1") || demo.customers[0] || { id: "customer-1", name: "Hana Bekele", phone: "0911000000" };
}
function PageHeading({ title, description }: { title: string; description?: string }) {
  const { locale } = useDemo();
  return <header className="page-heading"><p className="eyebrow">{t("homeKicker", locale)}</p><h1>{title}</h1>{description && <p>{description}</p>}</header>;
}

export function CustomerSignIn({ otp = false }: { otp?: boolean }) {
  const { locale, setRole } = useDemo();
  const router = useRouter();
  const [phone, setPhone] = useState("0911000000");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otp) {
      if (!/^(?:09\d{8}|\+2519\d{8})$/.test(phone.replace(/\s/g, ""))) { setError(t("customerPhoneError", locale)); setStatus("error"); setMessage(t("nextStepHint", locale)); return; }
      setError(""); setStatus("loading"); setMessage("");
      window.setTimeout(() => { setStatus("success"); setMessage(t("customerOtpDemo", locale)); window.setTimeout(() => router.push("/verify-otp"), 240); }, 240);
      return;
    }
    if (code !== "123456") { setError(t("customerOtpError", locale)); setStatus("error"); setMessage(t("nextStepHint", locale)); return; }
    setError(""); setStatus("loading"); setMessage("");
    window.setTimeout(() => { setRole("customer"); setStatus("success"); setMessage(t("customerOtpDemo", locale)); window.setTimeout(() => router.push("/profile/setup"), 240); }, 240);
  }
  return <div className="page-stack narrow-form"><PageHeading title={otp ? t("otpCode", locale) : t("customerSignInTitle", locale)} description={otp ? t("customerOtpDemo", locale) : t("customerSignInHelp", locale)} />
    <FormState status={status} locale={locale} message={message}><form className="card form-card" onSubmit={submit} noValidate>
      {!otp ? <><label className="label" htmlFor="customer-phone">{t("phoneNumber", locale)} *</label><input id="customer-phone" className={`field ${error ? "field-error" : ""}`} type="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "customer-phone-error" : undefined} />{error && <p className="field-error-text" id="customer-phone-error">{error}</p>}<button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("continueToOtp", locale)} <ArrowRight size={15} aria-hidden="true" /></button></> : <><label className="label" htmlFor="customer-otp">{t("otpCode", locale)} *</label><input id="customer-otp" className={`field ${error ? "field-error" : ""}`} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => { setCode(event.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "customer-otp-error" : "customer-otp-help"} />{error && <p className="field-error-text" id="customer-otp-error">{error}</p>}<p className="field-help" id="customer-otp-help">{t("customerOtpDemo", locale)}</p><div className="form-actions"><Link className="btn btn-secondary" href="/sign-in">{t("back", locale)}</Link><button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("verify", locale)}</button></div></>}
      <p className="small-note">{t("accessNotice", locale)}</p>
    </form></FormState>
  </div>;
}

export function CustomerProfileSetup() {
  const demo = useDemo(); const { locale } = demo; const router = useRouter();
  const current = customerAccount(demo);
  const [name, setName] = useState(current.name); const [phone, setPhone] = useState(current.phone);
  const [email, setEmail] = useState(current.email || ""); const [eventDate, setEventDate] = useState(current.eventDate || "");
  const [guests, setGuests] = useState(current.guests ? String(current.guests) : ""); const [budget, setBudget] = useState(current.budgetRange || "");
  const [area, setArea] = useState(current.preferredArea || ""); const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState(""); const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { setName(current.name); setPhone(current.phone); setEmail(current.email || ""); setEventDate(current.eventDate || ""); setGuests(current.guests ? String(current.guests) : ""); setBudget(current.budgetRange || ""); setArea(current.preferredArea || ""); }, [current]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next: Record<string, string> = {};
    if (!name.trim()) next.name = t("enterName", locale);
    if (!/^(?:09\d{8}|\+2519\d{8})$/.test(phone.replace(/\s/g, ""))) next.phone = t("customerPhoneError", locale);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t("emailError", locale);
    if (guests && (!Number.isInteger(Number(guests)) || Number(guests) < 1)) next.guests = t("guestsError", locale);
    setErrors(next); if (Object.keys(next).length) { setStatus("error"); setMessage(t("nextStepHint", locale)); return; }
    setStatus("loading"); setMessage(""); window.setTimeout(() => { demo.saveCustomer({ ...current, name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, eventDate: eventDate || undefined, guests: guests ? Number(guests) : undefined, budgetRange: budget || undefined, preferredArea: area || undefined }); setStatus("success"); setMessage(t("profileUpdated", locale)); }, 250);
  }
  return <div className="page-stack narrow-form"><PageHeading title={t("profileSetupTitle", locale)} description={t("profileSetupHelp", locale)} />
    <FormState status={status} locale={locale} message={message}><form className="card form-card" onSubmit={submit} noValidate>
      <label className="label" htmlFor="setup-name">{t("fullName", locale)} *</label><input id="setup-name" className={`field ${errors.name ? "field-error" : ""}`} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />{errors.name && <p className="field-error-text">{errors.name}</p>}
      <label className="label" htmlFor="setup-phone">{t("phoneNumber", locale)} *</label><input id="setup-phone" className={`field ${errors.phone ? "field-error" : ""}`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} />{errors.phone && <p className="field-error-text">{errors.phone}</p>}
      <label className="label" htmlFor="setup-email">{t("emailLabel", locale)}</label><input id="setup-email" className={`field ${errors.email ? "field-error" : ""}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />{errors.email && <p className="field-error-text">{errors.email}</p>}
      <label className="label" htmlFor="setup-date">{t("eventDateLabel", locale)}</label><input id="setup-date" className="field" type="date" min={new Date().toISOString().slice(0,10)} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      <label className="label" htmlFor="setup-guests">{t("guestCountLabel", locale)}</label><input id="setup-guests" className={`field ${errors.guests ? "field-error" : ""}`} type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} aria-invalid={!!errors.guests} />{errors.guests && <p className="field-error-text">{errors.guests}</p>}
      <label className="label" htmlFor="setup-budget">{t("budgetRangeLabel", locale)}</label><input id="setup-budget" className="field" value={budget} onChange={(e) => setBudget(e.target.value)} />
      <label className="label" htmlFor="setup-area">{t("preferredAreaLabel", locale)}</label><input id="setup-area" className="field" value={area} onChange={(e) => setArea(e.target.value)} />
      <div className="form-actions"><Link className="btn btn-secondary" href="/my-event">{t("cancel", locale)}</Link><button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("saveProfile", locale)}</button></div>
    </form></FormState>
  </div>;
}

export function CustomerBookings() {
  const demo = useDemo(); const { locale } = demo; const loading = useLoading();
  const name = customerAccount(demo).name; const [query, setQuery] = useState(""); const [statusFilter, setStatusFilter] = useState("");
  const mine = demo.bookings.filter((booking) => booking.customer === name);
  const filtered = mine.filter((booking) => (!statusFilter || booking.status === statusFilter) && `${booking.id} ${demo.venues.find((venue) => venue.id === booking.venueId)?.name || ""} ${booking.eventDate}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><PageHeading title={t("myBookings", locale)} description={t("myBookingsHelp", locale)} />
    <div className="list-filters"><label className="label" htmlFor="customer-bookings-search">{t("search", locale)}</label><input id="customer-bookings-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder", locale)} /><label className="label" htmlFor="customer-booking-status">{t("status", locale)}</label><select id="customer-booking-status" className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">{t("allStatuses", locale)}</option>{["Requested", "Reserved", "Confirmed", "Completed", "Canceled"].map((value) => <option value={value} key={value}>{t(value.toLowerCase(), locale)}</option>)}</select></div>
    <ListState locale={locale} items={filtered.length} loading={loading} noResults={Boolean(query || statusFilter)} emptyKey="noBookings"><div className="stacked-list">{filtered.map((booking) => { const venue = demo.venues.find((item) => item.id === booking.venueId); return <article className="card inquiry-row" key={booking.id}><div><p className="eyebrow">{booking.id} · {t("sample", locale)}</p><h2>{venue?.name || t("venue", locale)}</h2><p><CalendarDays size={15} aria-hidden="true" />{formatDate(booking.eventDate, locale)} · {formatNumber(booking.guests, locale)} {t("guests", locale)}</p><p>{formatETB(booking.total, locale)}</p></div><div className="inquiry-row-side"><StatusBadge status={booking.status} locale={locale} /><Link className="btn btn-secondary" href={`/my-bookings/${booking.id}`}>{t("viewDetails", locale)}</Link></div></article>; })}</div></ListState>
  </div>;
}

export function CustomerBookingDetail({ bookingId }: { bookingId: string }) {
  const demo = useDemo(); const { locale } = demo; const name = customerAccount(demo).name;
  const booking = demo.bookings.find((item) => item.id === bookingId && item.customer === name);
  const [status, setStatus] = useState<FormStatus>("idle"); const [message, setMessage] = useState("");
  if (!booking) return <section className="card"><PageHeading title={t("notFound", locale)} /><Link className="btn btn-secondary" href="/my-bookings">{t("myBookings", locale)}</Link></section>;
  const venue = demo.venues.find((item) => item.id === booking.venueId);
  const payment = demo.payments.find((item) => item.bookingId === booking.id);
  const depositPaid = booking.status === "Reserved" || booking.status === "Confirmed" || booking.status === "Completed";
  const showContact = !demo.contactVenueAfterDeposit || depositPaid;
  function cancel() { demo.setBookingStatus(bookingId, "Canceled"); setStatus("success"); setMessage(t("bookingCanceledDemo", locale)); }
  return <div className="page-stack"><div className="breadcrumbs"><Link href="/my-bookings">{t("myBookings", locale)}</Link><span aria-hidden="true">/</span><span>{booking.id}</span></div>
    <FormState status={status} locale={locale} message={message}><section className="card detail-record"><div className="card-title-row"><div><p className="eyebrow">{t("sample", locale)} · {booking.id}</p><h1>{venue?.name || t("venue", locale)}</h1><p>{formatDate(booking.eventDate, locale)}</p></div><StatusBadge status={booking.status} locale={locale} /></div>
      <dl className="summary-dl"><div><dt>{t("guestLabel", locale)}</dt><dd>{formatNumber(booking.guests, locale)}</dd></div><div><dt>{t("package", locale)}</dt><dd>{booking.packageName}</dd></div><div><dt>{t("amount", locale)}</dt><dd>{formatETB(booking.total, locale)}</dd></div><div><dt>{t("deposit", locale)}</dt><dd>{formatETB(booking.deposit, locale)}</dd></div><div><dt>{t("paymentStatus", locale)}</dt><dd>{payment ? <StatusBadge status={payment.status} locale={locale} /> : t("pending", locale)}</dd></div></dl>
      {booking.notes && <section className="booking-notes"><h2>{t("notes", locale)}</h2><p>{booking.notes}</p></section>}
      <h2>{t("statusTimeline", locale)}</h2><div className="timeline"><span><i />{t("requested", locale)} · {formatDate(booking.createdAt, locale)}</span>{payment && <span><i />{t("paymentStatus", locale)} · <StatusBadge status={payment.status} locale={locale} /></span>}<span><i />{t(booking.status.toLowerCase(), locale)} · {formatDate(booking.eventDate, locale)}</span></div>
      <section className="response-box"><h2>{t("bookingContactTitle", locale)}</h2><p>{showContact ? (venue?.contact || t("contactDemoValue", locale)) : t("contactHiddenUntilDeposit", locale)}</p></section>
      <div className="form-actions"><Link className="btn btn-secondary" href="/my-bookings"><ArrowLeft size={15} aria-hidden="true" />{t("back", locale)}</Link>{payment && <Link className="btn btn-secondary" href={`/payments/receipt?booking=${booking.id}`}>{t("viewReceipt", locale)}</Link>}{!(["Canceled", "Completed"] as string[]).includes(booking.status) && <button className="btn btn-danger" type="button" onClick={cancel}>{t("cancelBookingRequest", locale)}</button>}</div>
    </section></FormState>
  </div>;
}

export function CustomerPayments() {
  const demo = useDemo(); const { locale } = demo; const loading = useLoading(); const [query, setQuery] = useState("");
  const name = customerAccount(demo).name; const bookingIds = demo.bookings.filter((booking) => booking.customer === name).map((booking) => booking.id);
  const payments = demo.payments.filter((payment) => bookingIds.includes(payment.bookingId));
  const filtered = payments.filter((payment) => `${payment.id} ${payment.bookingId} ${payment.status}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><PageHeading title={t("payments", locale)} description={t("paymentHistoryHelp", locale)} /><DemoPaymentNotice />
    <label className="label" htmlFor="payment-history-search">{t("search", locale)}</label><input id="payment-history-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder", locale)} />
    <ListState locale={locale} items={filtered.length} loading={loading} noResults={Boolean(query)} emptyKey="emptyPayments"><div className="responsive-table"><table><thead><tr><th>{t("sample", locale)}</th><th>{t("booking", locale)}</th><th>{t("date", locale)}</th><th>{t("amount", locale)}</th><th>{t("status", locale)}</th><th>{t("action", locale)}</th></tr></thead><tbody>{filtered.map((payment) => <tr key={payment.id}><td data-label={t("sample", locale)}>{payment.id} · {t("sample", locale)}</td><td data-label={t("booking", locale)}>{payment.bookingId}</td><td data-label={t("date", locale)}>{formatDate(payment.date, locale)}</td><td data-label={t("amount", locale)}>{formatETB(payment.amount, locale)}</td><td data-label={t("status", locale)}><StatusBadge status={payment.status} locale={locale} /></td><td data-label={t("action", locale)}><Link className="btn btn-secondary" href={`/payments/receipt?booking=${payment.bookingId}`}>{t("viewReceipt", locale)}</Link></td></tr>)}</tbody></table></div></ListState>
  </div>;
}

export function CustomerSavedVendors() {
  const demo = useDemo(); const { locale } = demo; const loading = useLoading(); const [query, setQuery] = useState("");
  const vendors = demo.vendors.filter((vendor) => demo.savedVendors.includes(vendor.id));
  const filtered = vendors.filter((vendor) => `${vendor.name} ${vendor.category} ${vendor.area}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><PageHeading title={t("savedVendorsTitle", locale)} description={t("savedVendorsHelp", locale)} />
    <label className="label" htmlFor="saved-vendor-search"><Search size={15} aria-hidden="true" />{t("search", locale)}</label><input id="saved-vendor-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("vendorSearchPlaceholder", locale)} />
    <ListState locale={locale} items={filtered.length} loading={loading} noResults={Boolean(query)} emptyKey="emptySavedVendors"><div className="stacked-list">{filtered.map((vendor) => <article className="card inquiry-row" key={vendor.id}><div><p className="eyebrow">{vendor.category}</p><h2>{vendor.name}</h2><p><MapPin size={15} aria-hidden="true" />{vendor.area} · {formatETB(vendor.startingPrice, locale)}</p></div><div className="inquiry-row-side"><Link className="btn btn-secondary" href={`/vendors/${vendor.id}`}>{t("viewDetails", locale)}</Link><button className="btn btn-secondary" type="button" onClick={() => demo.toggleSaved(vendor.id)}><Heart size={15} aria-hidden="true" />{t("removeSaved", locale)}</button></div></article>)}</div></ListState>
  </div>;
}

export function CustomerNotifications() {
  const demo = useDemo(); const { locale } = demo; const loading = useLoading(); const [query, setQuery] = useState("");
  const notifications = [
    { id: "notice-booking", title: t("prefBookings", locale), message: t("myBookingsHelp", locale) },
    { id: "notice-inquiry", title: t("prefInquiries", locale), message: t("inquiryListHelp", locale) },
    { id: "notice-payment", title: t("prefPayments", locale), message: t("paymentHistoryHelp", locale) },
  ];
  const filtered = notifications.filter((item) => `${item.title} ${item.message}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack"><PageHeading title={t("notificationsTitle", locale)} description={t("sampleStaticContent", locale)} /><label className="label" htmlFor="customer-notice-search">{t("search", locale)}</label><input id="customer-notice-search" className="field" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder", locale)} />
    <ListState locale={locale} items={filtered.length} loading={loading} noResults={Boolean(query)} emptyKey="emptyNotifications"><div className="stacked-list">{filtered.map((item) => <article className="card notification-card" key={item.id}><Bell size={17} aria-hidden="true" /><div><h2>{item.title}</h2><p>{item.message}</p><span className="tag">{t("sample", locale)}</span></div></article>)}</div></ListState>
  </div>;
}

export function CustomerSettings() {
  const demo = useDemo(); const { locale } = demo; const current = customerAccount(demo);
  const [name, setName] = useState(current.name); const [phone, setPhone] = useState(current.phone); const [email, setEmail] = useState(current.email || "");
  const [prefs, setPrefs] = useState(demo.notificationPreferences); const [status, setStatus] = useState<FormStatus>("idle"); const [message, setMessage] = useState(""); const [errors, setErrors] = useState<Record<string,string>>({});
  useEffect(() => { setName(current.name); setPhone(current.phone); setEmail(current.email || ""); setPrefs(demo.notificationPreferences); }, [current, demo.notificationPreferences]);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next: Record<string,string> = {};
    if (!name.trim()) next.name = t("enterName", locale);
    if (!/^(?:09\d{8}|\+2519\d{8})$/.test(phone.replace(/\s/g,""))) next.phone = t("customerPhoneError", locale);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t("emailError", locale);
    setErrors(next); if (Object.keys(next).length) { setStatus("error"); setMessage(t("nextStepHint", locale)); return; }
    setStatus("loading"); setMessage(""); window.setTimeout(() => { demo.saveCustomer({ ...current, name: name.trim(), phone: phone.trim(), email: email.trim() || undefined }); demo.saveNotificationPreferences(prefs); setStatus("success"); setMessage(t("preferencesSaved", locale)); }, 240);
  }
  function signOut() { demo.setRole("customer"); setStatus("success"); setMessage(t("signedOutDemo", locale)); }
  return <div className="page-stack narrow-form"><PageHeading title={t("profileSettingsTitle", locale)} description={t("accessNotice", locale)} />
    <FormState status={status} locale={locale} message={message}><form className="card form-card" onSubmit={submit} noValidate>
      <div className="form-section"><h2><UserRound size={17} aria-hidden="true" />{t("profile", locale)}</h2><label className="label" htmlFor="settings-name">{t("fullName", locale)} *</label><input id="settings-name" className={`field ${errors.name ? "field-error" : ""}`} value={name} onChange={(e) => setName(e.target.value)} />{errors.name && <p className="field-error-text">{errors.name}</p>}<label className="label" htmlFor="settings-phone">{t("phoneNumber", locale)} *</label><input id="settings-phone" className={`field ${errors.phone ? "field-error" : ""}`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />{errors.phone && <p className="field-error-text">{errors.phone}</p>}<label className="label" htmlFor="settings-email">{t("emailLabel", locale)}</label><input id="settings-email" className={`field ${errors.email ? "field-error" : ""}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />{errors.email && <p className="field-error-text">{errors.email}</p>}</div>
      <fieldset className="form-section"><legend>{t("notificationPreferences", locale)}</legend>{[["booking","prefBookings"],["inquiry","prefInquiries"],["payment","prefPayments"],["vendor","prefVendors"]].map(([key,label]) => <label className="checkbox-card" key={key}><input type="checkbox" checked={!!prefs[key]} onChange={(event) => setPrefs((old) => ({ ...old, [key]: event.target.checked }))} /><span>{t(label, locale)}</span></label>)}</fieldset>
      <label className="label" htmlFor="settings-language">{t("language", locale)}</label><select id="settings-language" className="field" value={locale} onChange={(event) => demo.setLocale(event.target.value as "en" | "am")}><option value="en">{t("languageEnglish", locale)}</option><option value="am">{t("languageAmharic", locale)}</option></select>
      <div className="form-actions"><button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("saveChanges", locale)}</button><button className="btn btn-secondary" type="button" onClick={signOut}>{t("signOutDemo", locale)}</button></div>
    </form></FormState>
  </div>;
}

export function StaticCustomerPage({ page }: { page: "about" | "faq" | "terms" | "privacy" }) {
  const demo = useDemo(); const { locale } = demo;
  if (page === "faq") return <div className="page-stack"><PageHeading title={t("faqPageTitle", locale)} /><article className="card"><h2>{t("faqQuestion", locale)}</h2><p>{t("faqAnswer", locale)}</p><DemoPaymentNotice /></article></div>;
  if (page === "about") return <div className="page-stack"><PageHeading title={t("aboutPageTitle", locale)} /><article className="card"><p>{t("aboutPageText", locale)}</p><p className="inline-notice">{t("sampleStaticContent", locale)}</p></article></div>;
  const key = page === "terms" ? `terms_${locale}` : `privacy_${locale}`;
  return <div className="page-stack"><PageHeading title={t(page === "terms" ? "termsPageTitle" : "privacyPageTitle", locale)} /><article className="card"><p>{demo.staticContent[key] || t("sampleStaticContent", locale)}</p><p className="inline-notice">{t("sampleStaticContent", locale)}</p></article></div>;
}

export function ContactPage() {
  const { locale } = useDemo(); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [messageText, setMessageText] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle"); const [feedback, setFeedback] = useState(""); const [errors, setErrors] = useState<Record<string,string>>({});
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next: Record<string,string> = {}; if (!name.trim()) next.name = t("enterName", locale); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t("emailError", locale); if (!messageText.trim()) next.message = t("messageRequired", locale);
    setErrors(next); if (Object.keys(next).length) { setStatus("error"); setFeedback(t("nextStepHint", locale)); return; }
    setStatus("loading"); setFeedback(""); window.setTimeout(() => { setStatus("success"); setFeedback(t("contactSuccess", locale)); }, 230);
  }
  return <div className="page-stack narrow-form"><PageHeading title={t("contactPageTitle", locale)} description={t("contactPageHelp", locale)} /><FormState status={status} locale={locale} message={feedback}><form className="card form-card" onSubmit={submit} noValidate>
    <label className="label" htmlFor="contact-name">{t("fullName", locale)} *</label><input id="contact-name" className={`field ${errors.name ? "field-error" : ""}`} value={name} onChange={(e) => setName(e.target.value)} />{errors.name && <p className="field-error-text">{errors.name}</p>}
    <label className="label" htmlFor="contact-email">{t("emailLabel", locale)}</label><input id="contact-email" className={`field ${errors.email ? "field-error" : ""}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />{errors.email && <p className="field-error-text">{errors.email}</p>}
    <label className="label" htmlFor="contact-message">{t("contactMessageLabel", locale)} *</label><textarea id="contact-message" className={`field textarea ${errors.message ? "field-error" : ""}`} value={messageText} onChange={(e) => setMessageText(e.target.value)} />{errors.message && <p className="field-error-text">{errors.message}</p>}
    <button className="btn btn-primary" type="submit" disabled={status === "loading"}>{t("submit", locale)} <ArrowRight size={15} aria-hidden="true" /></button><p className="small-note">{t("contactPageHelp", locale)}</p>
  </form></FormState></div>;
}
