"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { useDemo } from "@/lib/store";
import { formatETB, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { VenueBrowser } from "@/components/CoreFlow";

const images = ["/manus-storage/async-images/eUSSNvIwIoymiq3j0wTJPV/image-1.webp", "/manus-storage/async-images/eUSSNvIwIoymiq3j0wTJPV/image-2.webp", "/manus-storage/async-images/eUSSNvIwIoymiq3j0wTJPV/image-3.webp"];

export function LandingPage() {
  const { locale, venues } = useDemo();
  return <div className="page-stack landing-page">
    <section className="home-hero">
      <div className="home-copy">
        <p className="eyebrow"><Sparkles size={14} aria-hidden="true" />{t("homeKicker", locale)}</p>
        <h1>{t("homeHeadline", locale)}</h1>
        <p className="home-lead">{t("homeDescription", locale)}</p>
        <div className="hero-actions"><Link className="btn btn-primary" href="/venues">{t("exploreVenues", locale)} <ArrowRight size={17} aria-hidden="true" /></Link><Link className="btn btn-secondary" href="/vendors">{t("exploreVendors", locale)}</Link></div>
        <div className="home-location"><MapPin size={15} aria-hidden="true" /><span>Addis Ababa</span><span className="location-divider" /><span>{t("localOnly", locale)}</span></div>
      </div>
      <div className="hero-image-wrap"><img src={images[0]} alt="A welcoming event hall in Addis Ababa prepared for a gathering" /><div className="hero-image-caption"><span className="caption-kicker">ADDIS ABABA</span><strong>{t("tagline", locale)}</strong></div></div>
    </section>
    <section className="home-browse-strip" aria-label={t("searchVenues", locale)}>
      <div><span className="eyebrow">{t("popularAreas", locale)}</span><strong>Bole · Kazanchis · Sar Bet · CMC</strong></div><Link className="text-link" href="/venues">{t("viewAllVenues", locale)} <ArrowRight size={15} aria-hidden="true" /></Link>
    </section>
    <section className="featured-section"><div className="section-heading"><div><p className="eyebrow">{t("featured", locale)}</p><h2>{t("latestVenues", locale)}</h2></div><Link className="text-link" href="/venues">{t("viewAllVenues", locale)} <ArrowRight size={15} aria-hidden="true" /></Link></div>
      <div className="featured-grid">{venues.slice(0, 3).map((venue, index) => <article className="featured-card" key={venue.id}><Link href={`/venues/${venue.id}`} className="featured-photo"><img src={venue.photos?.[0] || images[index]} alt={`${venue.area} event venue`} loading="lazy" /><span className="photo-chip"><MapPin size={13} aria-hidden="true" />{venue.area}</span></Link><div className="featured-copy"><span className="eyebrow">{t(({ "Wedding hall": "venueWeddingHall", "Garden venue": "venueGarden", "Conference space": "venueConference", "Hotel ballroom": "venueBallroom" } as Record<string, string>)[venue.type] || "venue", locale)}</span><h3><Link href={`/venues/${venue.id}`}>{venue.name}</Link></h3><p>{formatNumber(venue.capacity, locale)} {t("guests", locale)} <span aria-hidden="true">·</span> {t("startingAt", locale)} {formatETB(venue.price, locale)}</p></div></article>)}</div>
    </section>
    <section className="home-how"><div><p className="eyebrow">{t("nextStep", locale)}</p><h2>{t("bookingRequest", locale)}</h2><p>{t("dateRule", locale)}</p></div><Link className="btn btn-secondary" href="/venues">{t("exploreVenues", locale)} <ArrowRight size={16} aria-hidden="true" /></Link></section>
    <details className="all-venues-disclosure"><summary>{t("searchVenues", locale)}</summary><VenueBrowser /></details>
  </div>;
}
