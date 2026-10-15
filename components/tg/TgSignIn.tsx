"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { CustomerSignIn } from "@/components/CustomerExtras";
import { useRouter } from "@/lib/nav";
import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";
import { getTelegramDisplayName, getTelegramUser, isTelegramMiniApp } from "@/lib/telegram";

/**
 * Mini App sign-in.
 *
 * Inside Telegram we offer one-tap sign-in using the Telegram account name,
 * which becomes the demo booking account (the screen says so explicitly).
 * Everywhere else — and as a fallback — the shared phone/OTP demo sign-in from
 * CustomerExtras is rendered unchanged, so /tg works in a plain browser.
 */
export function TgSignIn() {
  const demo = useDemo();
  const { locale } = demo;
  const router = useRouter();
  const [inTelegram, setInTelegram] = useState(false);
  const [telegramName, setTelegramName] = useState<string | null>(null);

  // Read after mount: window.Telegram only exists in the browser.
  useEffect(() => {
    setInTelegram(isTelegramMiniApp());
    setTelegramName(getTelegramDisplayName());
  }, []);

  const customer = demo.customers.find((item) => item.id === "customer-1") || demo.customers[0];
  const telegramUser = getTelegramUser();

  function continueWithTelegram() {
    if (!telegramName) return;
    if (customer) demo.saveCustomer({ ...customer, name: telegramName });
    demo.setRole("customer");
    router.push("/");
  }

  return <div className="page-stack narrow-form">
    {inTelegram && telegramName
      ? <section className="card">
          <div className="card-title-row">
            <div>
              <p className="eyebrow">{t("tgTelegramDetected", locale)}</p>
              <h1>{telegramName}</h1>
              <p className="muted">{telegramUser?.username ? `@${telegramUser.username}` : t("tgTelegramHelp", locale)}</p>
            </div>
            <span className="avatar-dot" aria-hidden="true">{telegramName.charAt(0)}</span>
          </div>
          <p className="small-note">{t("tgTelegramHelp", locale)}</p>
          <button type="button" className="btn btn-primary full-width" onClick={continueWithTelegram}>
            <ShieldCheck size={17} aria-hidden="true" />{t("tgTelegramTitle", locale)}
          </button>
        </section>
      : <p className="inline-notice">{t("tgNoTelegram", locale)}</p>}
    <CustomerSignIn />
  </div>;
}
