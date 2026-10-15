"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";

const mainLinks = [
  ["/", "home"], ["/venues", "venues"], ["/vendors", "vendors"], ["/about", "about"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, role } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const [activationCount, setActivationCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = "ltr"; }, [locale]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function activateFooterLogo() {
    const next = activationCount + 1;
    if (next >= 5) {
      setActivationCount(0);
      router.push("/demo");
    } else setActivationCount(next);
  }

  // The Telegram Mini App (/tg) and its desktop preview frame ship their own chrome,
  // so the web shell is skipped for both.
  if (pathname === "/tg" || pathname.startsWith("/tg/") || pathname.startsWith("/tg-preview")) return <>{children}</>;

  return <div className="shell">
    <a className="skip-link" href="#main-content">{t("skipContent", locale)}</a>
    <div className="top-notice"><span className="notice-dot" aria-hidden="true" />{t("noBackend", locale)} <span>{t("noCredentials", locale)}</span></div>
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand-lockup" href="/" aria-label={`${t("brand", locale)} — ${t("home", locale)}`}>
          <span className="brand-mark" aria-hidden="true"><span /><span /></span>
          <span><strong>{t("brand", locale)}</strong><small>{t("tagline", locale)}</small></span>
        </Link>
        <button className="mobile-nav-toggle btn btn-secondary" type="button" aria-expanded={mobileOpen} aria-controls="primary-navigation" aria-label={t(mobileOpen ? "menuClose" : "menuOpen", locale)} onClick={() => setMobileOpen((v) => !v)}>
          <ChevronDown size={18} aria-hidden="true" />{t("menuOpen", locale)}
        </button>
        <nav id="primary-navigation" className={`primary-nav ${mobileOpen ? "is-open" : ""}`} aria-label={t("ariaNavigation", locale)}>
          {mainLinks.map(([href, key]) => <Link key={href} className={pathname === href ? "active" : ""} href={href}>{t(key, locale)}</Link>)}
          <Link className={pathname.startsWith("/my-") || pathname === "/profile" ? "active" : ""} href={role === "customer" ? "/my-event" : "/sign-in"}>{t("myEvent", locale)}</Link>
          <Link href={role === "vendor" ? "/vendor" : "/vendor/sign-in"}>{t("vendorArea", locale)}</Link>
          <Link href={role === "admin" ? "/admin" : "/admin/login"}>{t("admin", locale)}</Link>
        </nav>
        <div className="header-actions">
          <Link className="icon-link" href={role === "admin" ? "/admin/notifications" : role === "vendor" ? "/vendor/notifications" : "/notifications"} aria-label={t("ariaNotifications", locale)}><Bell size={19} aria-hidden="true" /><span className="sr-only">{t("notifications", locale)}</span></Link>
          <label className="sr-only" htmlFor="locale-select">{t("ariaLanguage", locale)}</label>
          <span className="language-symbol" aria-hidden="true"><Languages size={17} /></span>
          <select id="locale-select" className="locale-select" value={locale} aria-label={t("ariaLanguage", locale)} onChange={(e) => setLocale(e.target.value as "en" | "am")}>
            <option value="en">{t("languageEnglish", locale)}</option><option value="am">{t("languageAmharic", locale)}</option>
          </select>
          <Link className="btn btn-primary sign-in-link" href="/sign-in">{t("signIn", locale)}</Link>
        </div>
      </div>
    </header>
    <main id="main-content" className="container main-content" tabIndex={-1}>{children}</main>
    <footer className="site-footer">
      <div className="container footer-inner">
        <button type="button" className="footer-brand-button" onClick={activateFooterLogo} aria-label={t("ariaFooterLogo", locale)} aria-describedby="footer-logo-help">
          <span className="brand-mark" aria-hidden="true"><span /><span /></span>
          <span><strong>{t("brand", locale)}</strong><small>{t("footerNote", locale)}</small></span>
        </button>
        <p id="footer-logo-help" className="footer-demo-hint">{t("demoInstructions", locale)}</p>
        <div className="footer-links"><Link href="/faq">{t("faq", locale)}</Link><Link href="/terms">{t("terms", locale)}</Link><Link href="/privacy">{t("privacy", locale)}</Link><Link href="/contact">{t("contact", locale)}</Link><Link href="/vendor/apply">{t("vendorApplyTitle", locale)}</Link></div>
        {activationCount > 0 && <p className="activation-count" role="status" aria-live="polite">{t("footerCounter", locale)}: {activationCount}/5</p>}
        <p className="footer-disclaimer">{t("accessNotice", locale)}</p>
      </div>
    </footer>
  </div>;
}
