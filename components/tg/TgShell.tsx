"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, SlidersHorizontal } from "lucide-react";
import { Link, useRouter } from "@/lib/nav";
import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";
import { initTelegram, setTelegramBackButton } from "@/lib/telegram";
import { TgBottomNav } from "@/components/tg/TgBottomNav";

const rootTabs = ["/", "/venues", "/my-event", "/profile"];

/**
 * Mobile chrome for the Telegram Mini App: a compact top bar plus the bottom
 * navigation. The web header, footer and demo-notice strip are intentionally
 * absent — AppShell skips them for /tg.
 */
export function TgShell({ children }: { children: React.ReactNode }) {
  const { locale, setLocale } = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const brand = t("brand", locale);
  const logical = pathname.replace(/^\/tg(?=\/|$)/, "") || "/";
  const atRootTab = rootTabs.includes(logical);

  // Boot telegram-web-app.js (no-op in a normal browser).
  useEffect(() => { initTelegram(); }, []);
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
          <Link className="tg-icon-btn" href="/demo" aria-label={t("demoMenu", locale)}>
            <SlidersHorizontal size={20} aria-hidden="true" />
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
    <main className="tg-main" tabIndex={-1}>{children}</main>
    <TgBottomNav />
  </div>;
}
