"use client";

import { useState } from "react";
import { Link } from "@/lib/nav";
import { ArrowRight, CalendarDays, Check, MapPin, Sparkles } from "lucide-react";
import { useDemo } from "@/lib/store";
import { formatETB, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { VenueBrowser } from "@/components/CoreFlow";
import { FALLBACK_LANDING_HERO_IMAGE, LANDING_HERO_IMAGE, venueImage ,} from "@/lib/images";

export function LandingPage() {
  const { locale, venues } = useDemo();
  const [heroImage, setHeroImage] = useState(LANDING_HERO_IMAGE);

  return <div className="page-stack landing-page">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-copy">
        <p className="eyebrow">{t("homeKicker", locale)}</p>
        <h1 id="home-title">{t("homeHeadline", locale)}</h1>
        <p className="home-lead">{t("homeDescription", locale)}</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/venues">{t("exploreVenues", locale)} <ArrowRight size={17} aria-hidden="true" /></Link>
          <Link className="btn btn-secondary" href="/bookings/new"><CalendarDays size={17} aria-hidden="true" />{t("bookVenue", locale)}</Link>
        </div>
        <Link className="hero-vendor-link text-link" href="/vendors">{t("exploreVendors", locale)} <ArrowRight size={15} aria-hidden="true" /></Link>
        <Link className="hero-vendor-link text-link" href="/vendor/apply">Join as a vendor <ArrowRight size={15} aria-hidden="true" /></Link>
        <div className="home-location"><MapPin size={15} aria-hidden="true" /><span>{t("addisAbaba", locale)}</span><span className="location-divider" /><span>{t("localOnly", locale)}</span></div>
        <ul className="home-proof" aria-label={t("homeProofLabel", locale)}>
          <li><Check size={15} aria-hidden="true" /><span>{t("homeProofOne", locale)}</span></li>
          <li><Check size={15} aria-hidden="true" /><span>{t("homeProofTwo", locale)}</span></li>
          <li><Check size={15} aria-hidden="true" /><span>{t("homeProofThree", locale)}</span></li>
        </ul>
      </div>
      <div className="hero-image-wrap">
        <img
          src={heroImage}
          alt={t("heroImageAlt", locale)}
          onError={() => setHeroImage(FALLBACK_LANDING_HERO_IMAGE)}
        />
        <div className="hero-image-caption"><span className="caption-kicker">{t("addisAbaba", locale)}</span><strong>{t("tagline", locale)}</strong></div>
      </div>
    </section>
    <section className="home-browse-strip" aria-label={t("searchVenues", locale)}>
      <div><span className="eyebrow">{t("popularAreas", locale)}</span><strong>Bole · Kazanchis · Sar Bet · CMC</strong></div>
      <Link className="text-link" href="/venues">{t("viewAllVenues", locale)} <ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
    <section className="featured-section" aria-labelledby="featured-title">
      <div className="section-heading"><div><p className="eyebrow">{t("featured", locale)}</p><h2 id="featured-title">{t("latestVenues", locale)}</h2></div><Link className="text-link" href="/venues">{t("viewAllVenues", locale)} <ArrowRight size={15} aria-hidden="true" /></Link></div>
      <div className="featured-grid">{venues.slice(0, 3).map((venue, index) => <article className="featured-card" key={`${venue.id}-${index}`}><Link href={`/venues/${venue.id}`} className="featured-photo"><img src={venueImage(venue)} alt={`${venue.area} event venue`} loading="lazy" /><span className="photo-chip"><MapPin size={13} aria-hidden="true" />{venue.area}</span></Link><div className="featured-copy"><span className="eyebrow">{t(({ "Wedding hall": "venueWeddingHall", "Garden venue": "venueGarden", "Conference space": "venueConference", "Hotel ballroom": "venueBallroom" } as Record<string, string>)[venue.type] || "venue", locale)}</span><h3><Link href={`/venues/${venue.id}`}>{venue.name}</Link></h3><p>{formatNumber(venue.capacity, locale)} {t("guests", locale)} <span aria-hidden="true">·</span> {t("startingAt", locale)} {formatETB(venue.price, locale)}</p></div></article>)}</div>
    </section>
    <section className="home-how" aria-labelledby="how-title">
      <div className="home-how-copy"><p className="eyebrow">{t("nextStep", locale)}</p><h2 id="how-title">{t("homeHowTitle", locale)}</h2><p>{t("homeHowText", locale)}</p></div>
      <ol className="home-steps">
        <li><span>01</span>{t("homeStepOne", locale)}</li>
        <li><span>02</span>{t("homeStepTwo", locale)}</li>
        <li><span>03</span>{t("homeStepThree", locale)}</li>
      </ol>
      <Link className="btn btn-primary" href="/bookings/new">{t("bookVenue", locale)} <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
    <details className="all-venues-disclosure"><summary>{t("searchVenues", locale)}</summary><VenueBrowser /></details>
  </div>;
}
