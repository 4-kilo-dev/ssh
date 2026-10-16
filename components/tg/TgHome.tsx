"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, CalendarDays, MapPin, Search } from "lucide-react";
import { Link, useRouter } from "@/lib/nav";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { VenueCard } from "@/components/CoreFlow";
import { StatusBadge } from "@/components/StatusBadge";
import { FALLBACK_LANDING_HERO_IMAGE, LANDING_HERO_IMAGE } from "@/lib/images";
import { getTelegramDisplayName, isTelegramMiniApp } from "@/lib/telegram";

/**
 * Compact Mini App home: greeting, search, area chips, a My Event shortcut and
 * featured venues. The web LandingPage is a desktop marketing layout, so this
 * is a phone-first screen built from the same copy keys, the same VenueCard and
 * the same shared state.
 */
export function TgHome() {
  const { locale, venues, customers, bookings } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [telegramName, setTelegramName] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState(LANDING_HERO_IMAGE);

  useEffect(() => { if (isTelegramMiniApp()) setTelegramName(getTelegramDisplayName()); }, []);

  const customer = customers.find((item) => item.id === "customer-1") || customers[0];
  const greetingName = (telegramName || customer?.name || "").split(" ")[0];
  const areas = useMemo(() => Array.from(new Set(venues.map((venue) => venue.area))).slice(0, 6), [venues]);
  const featured = venues.slice(0, 4);
  const latest = useMemo(() => {
    const mine = bookings.filter((booking) => booking.customer === customer?.name);
    return [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  }, [bookings, customer?.name]);
  const latestVenue = venues.find((venue) => venue.id === latest?.venueId);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/venues?q=${encodeURIComponent(trimmed)}` : "/venues");
  }

  return <div className="page-stack tg-home-page">
    <section className="tg-greeting-block">
      <p className="tg-hello">{t("tgHello", locale)}{greetingName ? `, ${greetingName}` : ""}</p>
      <h1 className="tg-home-title">{t("homeHeadline", locale)}</h1>
    </section>

    <section className="tg-home-hero" aria-label={t("heroImageAlt", locale)}>
      <div className="tg-home-hero-image">
        <img src={heroImage} alt={t("heroImageAlt", locale)} onError={() => setHeroImage(FALLBACK_LANDING_HERO_IMAGE)} />
        <span>{t("addisAbaba", locale)} · {t("tagline", locale)}</span>
      </div>
      <div className="tg-home-hero-copy">
        <p>{t("homeDescription", locale)}</p>
        <div className="tg-home-actions">
          <Link className="btn btn-primary" href="/venues">{t("exploreVenues", locale)} <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link className="btn btn-secondary" href="/bookings/new"><CalendarDays size={16} aria-hidden="true" />{t("bookVenue", locale)}</Link>
        </div>
      </div>
    </section>

    <form className="tg-searchbar" role="search" onSubmit={submitSearch}>
      <div className="search-field">
        <Search size={16} aria-hidden="true" />
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder", locale)}
          aria-label={t("search", locale)}
        />
      </div>
      <button className="btn btn-primary" type="submit">{t("search", locale)}</button>
    </form>

    <div className="tg-chips" role="group" aria-label={t("popularAreas", locale)}>
      <Link className="tg-chip" href="/venues">{t("viewAllVenues", locale)}</Link>
      {areas.map((area) => <Link className="tg-chip" key={area} href={`/venues?area=${encodeURIComponent(area)}`}>
        <MapPin size={14} aria-hidden="true" />{area}
      </Link>)}
    </div>

    <Link className="card tg-shortcut" href="/my-event">
      <span className="avatar-dot" aria-hidden="true"><CalendarCheck size={18} /></span>
      <span className="tg-shortcut-copy">
        <strong>{t("myEventTitle", locale)}</strong>
        <small>{latest && latestVenue ? `${latestVenue.name} · ${formatDate(latest.eventDate, locale)}` : t("noBookings", locale)}</small>
        {latest && <span className="tg-shortcut-status"><StatusBadge status={latest.status} locale={locale} /></span>}
      </span>
      <ArrowRight size={18} className="tg-shortcut-arrow" aria-hidden="true" />
    </Link>

    <section>
      <div className="tg-section-head">
        <h2>{t("featured", locale)}</h2>
        <Link className="text-link" href="/venues">{t("viewAllVenues", locale)} <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="venue-grid">
        {featured.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
      </div>
    </section>

    <p className="small-note">{t("noBackend", locale)}</p>
  </div>;
}
