"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ExternalLink,
  Languages,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDemo } from "@/lib/store";
import { useSession } from "@/components/SessionProvider";
import { apiSend } from "@/lib/api";
import { t } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale, setLocale } = useDemo();
  const { account, clear: clearSession } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync HTML lang
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }, [locale]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiSend("/api/auth/logout", "POST");
      clearSession();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Skip web shell for Telegram Mini App routes
  if (
    pathname === "/tg" ||
    pathname.startsWith("/tg/") ||
    pathname.startsWith("/tg-preview")
  ) {
    return <>{children}</>;
  }

  // Skip consumer web shell for Admin Console - admin has its own dedicated 100vh frame
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  const isSuperAdmin = account?.role === "super_admin";
  const isManagerView = account?.role === "venue_manager" || pathname.startsWith("/manager");
  const isVendorView = account?.role === "vendor" || pathname.startsWith("/vendor");
  const isCustomerView = account?.role === "user";

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        {t("skipContent", locale)}
      </a>

      {/* Unified Site Header using standard design tokens */}
      <header className="site-header">
        <div className="container header-inner">
          <Link
            className="brand-lockup"
            href={isSuperAdmin ? "/admin" : isManagerView ? "/manager/venue" : isVendorView ? "/vendors" : "/"}
            aria-label={`${t("brand", locale)} — ${t("home", locale)}`}
          >
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <span>
              <strong>{t("brand", locale)}</strong>
              <small>
                {isManagerView
                  ? "Venue Workspace"
                  : isVendorView
                  ? "Vendor Portal"
                  : t("tagline", locale)}
              </small>
            </span>
          </Link>

          <button
            className="mobile-nav-toggle btn btn-secondary"
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="primary-navigation"
            aria-label={t(mobileOpen ? "menuClose" : "menuOpen", locale)}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            <span className="sr-only">{t(mobileOpen ? "menuClose" : "menuOpen", locale)}</span>
          </button>

          {mobileOpen && (
            <button
              className="mobile-nav-backdrop"
              type="button"
              aria-label={t("menuClose", locale)}
              onClick={() => setMobileOpen(false)}
            />
          )}

          <nav
            id="primary-navigation"
            className={`primary-nav ${mobileOpen ? "is-open" : ""}`}
            aria-label={t("ariaNavigation", locale)}
          >
            <div className="mobile-nav-drawer-head">
              <strong>{t("brand", locale)}</strong>
              <button
                className="mobile-nav-close"
                type="button"
                aria-label={t("menuClose", locale)}
                onClick={() => setMobileOpen(false)}
              >
                <X size={21} aria-hidden="true" />
              </button>
            </div>

            {/* Role-Specific Navigation Links */}
            {isManagerView ? (
              <>
                <Link
                  className={pathname.startsWith("/manager") ? "active" : ""}
                  href="/manager/venue"
                >
                  Venue Workspace
                </Link>
                <Link className={pathname === "/venues" ? "active" : ""} href="/venues">
                  {t("venues", locale)}
                </Link>
                <Link className={pathname === "/vendors" ? "active" : ""} href="/vendors">
                  {t("vendors", locale)}
                </Link>
              </>
            ) : isVendorView ? (
              <>
                <Link className={pathname === "/vendors" ? "active" : ""} href="/vendors">
                  {t("vendors", locale)}
                </Link>
                <Link className={pathname === "/venues" ? "active" : ""} href="/venues">
                  {t("venues", locale)}
                </Link>
                <Link className={pathname === "/about" ? "active" : ""} href="/about">
                  {t("about", locale)}
                </Link>
              </>
            ) : isCustomerView ? (
              <>
                <Link className={pathname === "/" ? "active" : ""} href="/">
                  {t("home", locale)}
                </Link>
                <Link className={pathname === "/venues" ? "active" : ""} href="/venues">
                  {t("venues", locale)}
                </Link>
                <Link className={pathname === "/vendors" ? "active" : ""} href="/vendors">
                  {t("vendors", locale)}
                </Link>
                <Link
                  className={pathname.startsWith("/my-event") ? "active" : ""}
                  href="/my-event"
                >
                  {t("myEvent", locale)}
                </Link>
                <Link className={pathname === "/about" ? "active" : ""} href="/about">
                  {t("about", locale)}
                </Link>
              </>
            ) : (
              /* Unauthenticated Visitor: Strictly limited public links (NO "My Event") */
              <>
                <Link className={pathname === "/" ? "active" : ""} href="/">
                  {t("home", locale)}
                </Link>
                <Link className={pathname === "/venues" ? "active" : ""} href="/venues">
                  {t("venues", locale)}
                </Link>
                <Link className={pathname === "/vendors" ? "active" : ""} href="/vendors">
                  {t("vendors", locale)}
                </Link>
                <Link className={pathname === "/about" ? "active" : ""} href="/about">
                  {t("about", locale)}
                </Link>
              </>
            )}
          </nav>

          <div className="header-actions">
            <label className="sr-only" htmlFor="locale-select">
              {t("ariaLanguage", locale)}
            </label>
            <span className="language-symbol" aria-hidden="true">
              <Languages size={17} />
            </span>
            <select
              id="locale-select"
              className="locale-select"
              value={locale}
              aria-label={t("ariaLanguage", locale)}
              onChange={(e) => setLocale(e.target.value as "en" | "am")}
            >
              <option value="en">{t("languageEnglish", locale)}</option>
              <option value="am">{t("languageAmharic", locale)}</option>
            </select>

            {account ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link
                  className="icon-link"
                  href="/notifications"
                  aria-label={t("notifications", locale) || "Notifications"}
                  title="Notifications"
                  style={{ padding: "6px" }}
                >
                  <Bell size={18} />
                </Link>

                {isSuperAdmin && (
                  <Link
                    href="/admin"
                    className="btn btn-secondary"
                    style={{ fontSize: "12px", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <ShieldCheck size={14} style={{ color: "var(--teal)" }} />
                    <span>Admin Console</span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--teal-dark)",
                    background: "var(--teal-soft)",
                    border: "1px solid rgba(13, 93, 86, 0.15)",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    textDecoration: "none",
                  }}
                  title="View Profile"
                >
                  {isSuperAdmin ? (
                    <ShieldCheck size={14} style={{ color: "var(--teal)" }} />
                  ) : isManagerView ? (
                    <Building2 size={14} style={{ color: "var(--teal)" }} />
                  ) : isVendorView ? (
                    <Sparkles size={14} style={{ color: "var(--teal)" }} />
                  ) : (
                    <User size={14} style={{ color: "var(--teal)" }} />
                  )}
                  {account.name}
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{ fontSize: "12px", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link className="btn btn-primary sign-in-link" href="/login">
                {t("signIn", locale)}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className={`container main-content site-wide-refresh ${isVendorView ? "vendor-area" : ""}`}
        tabIndex={-1}
      >
        {children}
      </main>

      {/* Footer (Public and consumer routes) */}
      <footer className="site-footer">
          <div className="container footer-inner">
            <div className="footer-brand-button" aria-describedby="footer-logo-help">
              <span className="brand-mark" aria-hidden="true">
                <span />
                <span />
              </span>
              <span>
                <strong>{t("brand", locale)}</strong>
                <small>{t("footerNote", locale)}</small>
              </span>
            </div>
            <p id="footer-logo-help" className="footer-demo-hint">
              {t("footerNote", locale)}
            </p>
            <div className="footer-links">
              <Link href="/faq">{t("faq", locale)}</Link>
              <Link href="/terms">{t("terms", locale)}</Link>
              <Link href="/privacy">{t("privacy", locale)}</Link>
              <Link href="/contact">{t("contact", locale)}</Link>
              <Link href="/vendor/apply">{t("vendorApplyTitle", locale)}</Link>
            </div>
          </div>
        </footer>
    </div>
  );
}
