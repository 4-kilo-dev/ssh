"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell } from "lucide-react";
import { Link, useRouter } from "@/lib/nav";
import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";
import { getTelegramInitData, initTelegram, isTelegramMiniApp, setTelegramBackButton } from "@/lib/telegram";
import { TgBottomNav } from "@/components/tg/TgBottomNav";
import { TgSignIn } from "@/components/tg/TgSignIn";

const rootTabs = ["/", "/venues", "/vendors", "/my-event", "/profile"];

/**
 * Mobile chrome for the Telegram Mini App: a compact top bar plus the bottom
 * navigation. The web header, footer and demo-notice strip are intentionally
 * absent — AppShell skips them for /tg.
 */
export function TgShell({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, hydrateFromServer, hydrateCatalogFromServer } = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [telegramMode, setTelegramMode] = useState<boolean | null>(null);
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "needs_password" | "unauthenticated">("loading");
  const brand = t("brand", locale);
  const logical = pathname.replace(/^\/tg(?=\/|$)/, "") || "/";
  const atRootTab = rootTabs.includes(logical);

  // Boot telegram-web-app.js (no-op in a normal browser).
  useEffect(() => { initTelegram(); }, []);
  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      const [venueResponse, vendorResponse] = await Promise.all([fetch("/api/venues"), fetch("/api/vendors?limit=100")]);
      const venueData = venueResponse.ok ? await venueResponse.json() : { venues: [] };
      const vendorData = vendorResponse.ok ? await vendorResponse.json() : { vendors: [] };
      if (!cancelled) {
        hydrateCatalogFromServer({ venues: venueData.venues || [], vendors: vendorData.vendors || [] });
        setAuthState("authenticated");
      }
    };
    const authenticate = () => {
      if (cancelled) return;
      const inTelegram = isTelegramMiniApp();
      setTelegramMode(inTelegram);
      if (!inTelegram) { loadCatalog().catch(() => setAuthState("authenticated")); return; }
    const hydrate = (account: { account?: { id: string; name: string; phone?: string; role: string; telegramId?: string | null }; status?: string } | null) => {
      if (!account?.account || account.status !== "authenticated") return;
      const authenticated = account.account;
      return Promise.all([
        fetch("/api/venues").then((response) => response.ok ? response.json() : { venues: [] }),
        fetch("/api/vendors?limit=100").then((response) => response.ok ? response.json() : { vendors: [] }),
        fetch("/api/bookings").then((response) => response.ok ? response.json() : []),
      ]).then(([venueData, vendorData, bookings]) => {
        if (cancelled) return;
        hydrateFromServer({ account: authenticated, venues: venueData.venues || [], vendors: vendorData.vendors || [], bookings: Array.isArray(bookings) ? bookings : [] });
        setAuthState("authenticated");
      });
    };
    fetch("/api/auth/me").then(async (response) => {
      if (response.ok) return response.json();
      const initData = getTelegramInitData();
      if (!initData) { setAuthState("unauthenticated"); return null; }
      const authResponse = await fetch("/api/auth/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData }) });
      const auth = await authResponse.json();
      if (auth.needsPassword) { setAuthState("needs_password"); if (search.get("setup") !== "password") router.replace("/?setup=password"); }
      return auth.status === "ok" ? auth : null;
    }).then((account) => { if (account?.status === "authenticated") return hydrate(account); if (search.get("setup") !== "password") setAuthState("unauthenticated"); }).catch(() => setAuthState("unauthenticated"));
    };
    let attempts = 0;
    const waitForTelegram = () => {
      if (cancelled) return;
      if (isTelegramMiniApp() || attempts >= 20) { authenticate(); return; }
      attempts += 1;
      window.setTimeout(waitForTelegram, 100);
    };
    waitForTelegram();
    return () => { cancelled = true; };
  // This runs once when the Telegram shell mounts; hydrateFromServer only uses setState.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = "ltr"; }, [locale]);

  // Telegram's native Back button, hidden on the four root tabs.
  useEffect(() => setTelegramBackButton(!atRootTab, () => router.back()), [atRootTab, router]);

  // Deep link in either language, e.g. /tg?lang=am — handy for the sales team.
  //
  // Written as a convergent effect rather than a one-shot: DemoProvider loads
  // its persisted state in its own mount effect, and child effects run first, so
  // the stored locale can land *after* this one. Re-applying only while the
  // locale differs settles once it sticks, and cannot loop — every store setter
  // is recreated when store data changes, so calling one unconditionally would.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (requested !== "am" && requested !== "en") return;
    if (locale === requested) return;
    setLocale(requested);
  }, [setLocale, locale]);

  return <div className="tg-shell">
    <header className="tg-topbar">
      <div className="tg-topbar-inner">
        <Link className="brand-lockup" href="/" aria-label={`${brand} — ${t("home", locale)}`}>
          <span className="brand-mark" aria-hidden="true"><span /><span /></span>
          <span><strong>{brand}</strong></span>
        </Link>
        <div className="tg-topbar-actions">
          <Link className="tg-icon-btn" href="/notifications" aria-label={t("notifications", locale)}>
            <Bell size={20} aria-hidden="true" />
          </Link>
          <select
            className="tg-locale"
            value={locale}
            aria-label={t("ariaLanguage", locale)}
            onChange={(event) => setLocale(event.target.value as "en" | "am")}
          >
            <option value="en">{t("languageEnglish", locale)}</option>
            <option value="am">{t("languageAmharic", locale)}</option>
          </select>
        </div>
      </div>
    </header>
    <main className="tg-main" tabIndex={-1}>{telegramMode === null || authState === "loading" ? <p className="muted">Connecting to Addis Gathering…</p> : telegramMode && authState === "unauthenticated" ? <TgSignIn /> : children}</main>
    <TgBottomNav />
  </div>;
}
