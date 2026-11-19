"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "@/lib/nav";
import { getTelegramInitData } from "@/lib/telegram";

export function TgPasswordSetup() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    const initData = getTelegramInitData();
    if (!initData) return setError("Open this screen from the Telegram bot.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/telegram/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create password");
      router.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create password");
    } finally {
      setLoading(false);
    }
  }

  return <div className="page-stack narrow-form">
    <section className="card form-card">
      <header className="page-heading"><p className="eyebrow"><KeyRound size={14} aria-hidden="true" /> Account security</p><h1>Create your password</h1><p>This secures your Addis Gathering account for the website and Telegram Mini App. Your password is sent only to our secure backend.</p></header>
      <form onSubmit={submit} noValidate>
        <label className="label" htmlFor="tg-password">Password</label>
        <input id="tg-password" className="field" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
        <label className="label" htmlFor="tg-password-confirm">Confirm password</label>
        <input id="tg-password-confirm" className="field" type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Enter it again" />
        {error && <p className="field-error-text" role="alert">{error}</p>}
        <button className="btn btn-primary full-width" type="submit" disabled={loading}><ShieldCheck size={17} aria-hidden="true" />{loading ? "Saving…" : "Create password"}</button>
      </form>
    </section>
  </div>;
}
