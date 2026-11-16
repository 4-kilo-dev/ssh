"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "@/lib/nav";
import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";
import { getTelegramDisplayName, getTelegramInitData, getTelegramUser, isTelegramMiniApp } from "@/lib/telegram";

/**
 * Mini App sign-in.
 *
 * Inside Telegram we offer one-tap sign-in using the Telegram account name,
 * which is verified server-side and linked to the database account.
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

  const telegramUser = getTelegramUser();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function continueWithTelegram() {
    const initData = getTelegramInitData();
    if (!initData) return;
    setLoading(true); setError(null);
    fetch("/api/auth/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData }) }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Authentication failed"); return data; }).then(() => router.push("/")).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Authentication failed")).finally(() => setLoading(false));
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
          <p className="small-note">Continue securely with your Telegram account.</p>
          {error && <p className="field-error-text" role="alert">{error}</p>}
          <button type="button" className="btn btn-primary full-width" onClick={continueWithTelegram} disabled={loading}>
            <ShieldCheck size={17} aria-hidden="true" />{loading ? "Connecting…" : "Continue with Telegram"}
          </button>
        </section>
      : <p className="inline-notice">Open this page from the Telegram bot to continue.</p>}
  </div>;
}
