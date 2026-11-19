"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
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
import { t } from "@/lib/i18n";

interface ServerAccount {
  id: string;
  name: string;
  phone: string;
  role: "super_admin" | "venue_manager" | "vendor" | "user" | string;
  telegramId?: string | null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { locale, setLocale } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [account, setAccount] = useState<ServerAccount | null>(null);

  // Sync HTML lang
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }, [locale]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Check live server authentication session on load & route change
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status === "authenticated" && data.account) {
          setAccount(data.account);
        } else {
          setAccount(null);
        }
      })
      .catch(() => setAccount(null));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAccount(null);
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

  const isAdminView = account?.role === "super_admin" || pathname.startsWith("/admin");
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
        <div className={`${isAdminView ? "fluid-container" : "container"} header-inner`}>
          <Link
            className="brand-lockup"
            href={isAdminView ? "/admin" : isManagerView ? "/manager/venue" : isVendorView ? "/vendors" : "/"}
            aria-label={`${t("brand", locale)} — ${t("home", locale)}`}
          >
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <span>
              <strong>{t("brand", locale)}</strong>
              <small style={isAdminView ? { color: "var(--teal)", fontWeight: 700 } : undefined}>
                {isAdminView
                  ? "Admin Console"
                  : isManagerView
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
            {isAdminView ? (
              <>
                <Link
                  className={pathname === "/admin" ? "active" : ""}
                  href="/admin#overview"
                >
                  Overview
                </Link>
                <Link href="/admin#onboard">Onboard Partner</Link>
                <Link href="/admin#tickets">Support Tickets</Link>
                <Link href="/admin#audit">Audit Logs</Link>
                <Link
                  href="/venues"
                  target="_blank"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  Public Site <ExternalLink size={12} />
                </Link>
              </>
            ) : isManagerView ? (
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
            {!isAdminView && (
              <>
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
              </>
            )}

            {account ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
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
                  }}
                >
                  {isAdminView ? (
                    <ShieldCheck size={14} style={{ color: "var(--teal)" }} />
                  ) : isManagerView ? (
                    <Building2 size={14} style={{ color: "var(--teal)" }} />
                  ) : isVendorView ? (
                    <Sparkles size={14} style={{ color: "var(--teal)" }} />
                  ) : (
                    <User size={14} style={{ color: "var(--teal)" }} />
                  )}
                  {account.name}
                </span>

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
        className={`${
          isAdminView
            ? "main-content-fluid site-wide-refresh admin-area-fluid"
            : `container main-content site-wide-refresh ${isVendorView ? "vendor-area" : ""}`
        }`}
        tabIndex={-1}
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className={`${isAdminView ? "fluid-container" : "container"} footer-inner`}>
          <div className="footer-brand-button" aria-describedby="footer-logo-help">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <span>
              <strong>{t("brand", locale)}</strong>
              <small>{isAdminView ? "Platform Operations & Oversight" : t("footerNote", locale)}</small>
            </span>
          </div>
          <p id="footer-logo-help" className="footer-demo-hint">
            {isAdminView ? "Authorized personnel only • Immutable audit trail enabled" : t("footerNote", locale)}
          </p>
          <div className="footer-links">
            {isAdminView ? (
              <>
                <Link href="/admin#overview">Overview</Link>
                <Link href="/admin#onboard">Onboard Partner</Link>
                <Link href="/admin#tickets">Support Tickets</Link>
                <Link href="/admin#audit">Audit Logs</Link>
                <Link href="/venues">Public Site</Link>
              </>
            ) : (
              <>
                <Link href="/faq">{t("faq", locale)}</Link>
                <Link href="/terms">{t("terms", locale)}</Link>
                <Link href="/privacy">{t("privacy", locale)}</Link>
                <Link href="/contact">{t("contact", locale)}</Link>
                <Link href="/vendor/apply">{t("vendorApplyTitle", locale)}</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
