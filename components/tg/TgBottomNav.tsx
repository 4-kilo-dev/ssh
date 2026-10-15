"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck, Home, MapPin, UserRound } from "lucide-react";
import { Link } from "@/lib/nav";
import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";

const tabs = [
  { href: "/", key: "home", Icon: Home },
  { href: "/venues", key: "venues", Icon: MapPin },
  { href: "/my-event", key: "myEvent", Icon: CalendarCheck },
  { href: "/profile", key: "tgProfileTab", Icon: UserRound },
] as const;

/** Bottom navigation: Home, Venues, My Event, Profile. */
export function TgBottomNav() {
  const { locale } = useDemo();
  const pathname = usePathname();
  const logical = pathname.replace(/^\/tg(?=\/|$)/, "") || "/";

  return <nav className="tg-bottomnav" aria-label={t("ariaNavigation", locale)}>
    {tabs.map(({ href, key, Icon }) => {
      const active = href === "/" ? logical === "/" : logical === href || logical.startsWith(`${href}/`);
      return <Link key={href} href={href} className="tg-navitem" aria-current={active ? "page" : undefined}>
        <Icon size={21} aria-hidden="true" />
        <span>{t(key, locale)}</span>
      </Link>;
    })}
  </nav>;
}
