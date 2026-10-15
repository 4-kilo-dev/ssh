import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { NavBaseProvider } from "@/lib/nav";
import { TgShell } from "@/components/tg/TgShell";
import "./tg.css";

export const metadata: Metadata = {
  title: "Addis Gathering — Telegram Mini App",
  description: "Find event venues and request bookings across Addis Ababa.",
};

/**
 * `viewportFit: "cover"` is what makes env(safe-area-inset-*) resolve inside
 * Telegram, so the shell can keep clear of the client's own bars.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7f3",
};

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return <NavBaseProvider base="/tg">
    <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
    <TgShell>{children}</TgShell>
  </NavBaseProvider>;
}
