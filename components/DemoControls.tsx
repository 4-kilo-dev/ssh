"use client";

import { useState } from "react";
import { ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { FormState } from "@/components/StatePatterns";

export function DemoControls() {
  const demo = useDemo();
  const { locale } = demo;
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  function save(action: () => void, successKey = "actionSaved") {
    setStatus("loading"); setMessage("");
    window.setTimeout(() => {
      try { action(); setStatus("success"); setMessage(t(successKey, locale)); }
      catch { setStatus("error"); setMessage(t("actionFailed", locale)); }
    }, 160);
  }
  return <div className="page-stack">
    <header className="page-heading">
      <div className="eyebrow"><SlidersHorizontal size={15} aria-hidden="true" />{t("simulationOnly", locale)}</div>
      <h1>{t("demoMenu", locale)}</h1>
      <p>{t("accessNotice", locale)}</p>
    </header>
    <div className="demo-notice" role="note"><ShieldAlert size={19} aria-hidden="true" /><div><strong>{t("demoNotice", locale)}</strong><p>{t("noTransactions", locale)} {t("noCredentials", locale)}</p></div></div>
    <FormState status={status} locale={locale} message={message}>
      <div className="settings-layout">
        <section className="card settings-card" aria-labelledby="demo-role-title">
          <h2 id="demo-role-title">{t("demoLabel", locale)}</h2>
          <p className="muted">{t("accessNotice", locale)}</p>
          <label className="label" htmlFor="preview-role">{t("demoLabel", locale)}</label>
          <select id="preview-role" className="field" value={demo.role} aria-label={t("ariaRole", locale)} onChange={(e) => { const value = e.target.value as "customer" | "vendor" | "admin"; save(() => demo.setRole(value), "roleChanged"); }}>
            <option value="customer">{t("customer", locale)}</option><option value="vendor">{t("vendor", locale)}</option><option value="admin">{t("administrator", locale)}</option>
          </select>
          <label className="label mt-4" htmlFor="staff-role">{t("staffRoles", locale)}</label>
          <select id="staff-role" className="field" value={demo.staffRole} onChange={(e) => { const value = e.target.value as typeof demo.staffRole; save(() => demo.setStaffRole(value)); }}>
            <option value="Super Admin">{t("superAdmin", locale)}</option><option value="Venue Manager">{t("venueManager", locale)}</option><option value="Vendor Manager">{t("vendorManager", locale)}</option><option value="Finance">{t("finance", locale)}</option>
          </select>
        </section>
        <section className="card settings-card" aria-labelledby="demo-payment-title">
          <h2 id="demo-payment-title">{t("paymentSelect", locale)}</h2>
          <p className="muted">{t("noTransactions", locale)}</p>
          <label className="label" htmlFor="payment-outcome">{t("outcomeLabel", locale)}</label>
          <select id="payment-outcome" className="field" value={demo.paymentOutcome} aria-label={t("ariaPayment", locale)} onChange={(e) => { const value = e.target.value as "success" | "failure" | "pending"; save(() => demo.setPaymentOutcome(value)); }}>
            <option value="success">{t("success", locale)}</option><option value="failure">{t("failure", locale)}</option><option value="pending">{t("pending", locale)}</option>
          </select>
          <p className="inline-notice mt-3">{t("demoNotice", locale)}</p>
        </section>
        <section className="card settings-card" aria-labelledby="demo-contact-title">
          <h2 id="demo-contact-title">{t("contactSettings", locale)}</h2>
          <label className="label" htmlFor="contact-venue">{t("venue", locale)} — {t("contactRuleVenue", locale)}</label>
          <select id="contact-venue" className="field" value={demo.contactVenueAfterDeposit ? "yes" : "no"} onChange={(e) => { const value = e.target.value === "yes"; save(() => demo.setContactRules(value, demo.contactVendorAfterAcceptance)); }}>
            <option value="yes">{t("afterDeposit", locale)}</option><option value="no">{t("maskedContact", locale)}</option>
          </select>
          <label className="label mt-4" htmlFor="contact-vendor">{t("vendor", locale)} — {t("contactRuleVendor", locale)}</label>
          <select id="contact-vendor" className="field" value={demo.contactVendorAfterAcceptance ? "yes" : "no"} onChange={(e) => { const value = e.target.value === "yes"; save(() => demo.setContactRules(demo.contactVenueAfterDeposit, value)); }}>
            <option value="yes">{t("afterAcceptance", locale)}</option><option value="no">{t("maskedContact", locale)}</option>
          </select>
        </section>
        <section className="card settings-card" aria-labelledby="demo-fee-title">
          <h2 id="demo-fee-title">{t("feeRules", locale)}</h2>
          <label className="label" htmlFor="fee-timing">{t("feeTiming", locale)}</label>
          <select id="fee-timing" className="field" value={demo.feeTiming} onChange={(e) => { const value = e.target.value as typeof demo.feeTiming; save(() => demo.setFeeTiming(value)); }}>
            <option value="inquiry sent">{t("chargeInquiry", locale)}</option><option value="vendor confirms">{t("chargeVendor", locale)}</option><option value="admin confirms">{t("chargeAdmin", locale)}</option>
          </select>
          <p className="muted mt-3">{t("sampleStatement", locale)} — {t("demoNotice", locale)}</p>
        </section>
      </div>
    </FormState>
    <section className="card help-card"><h2>{t("accessibility", locale)}</h2><p>{t("menuHidden", locale)} {t("openDemoPath", locale)} {t("activateFive", locale)} {t("menuAccessible", locale)} {t("noShortcut", locale)}</p><p>{t("localData", locale)}</p></section>
  </div>;
}
