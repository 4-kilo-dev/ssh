"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "@/lib/nav";
import { getTelegramInitData } from "@/lib/telegram";

export function TgPasswordSetup() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      window.location.assign("/tg");
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
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}><input id="tg-password" className="field" type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" style={{ paddingRight: "44px", width: "100%" }} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: "12px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)", padding: "4px" }}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>
        <label className="label" htmlFor="tg-password-confirm">Confirm password</label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}><input id="tg-password-confirm" className="field" type={showConfirm ? "text" : "password"} minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Enter it again" style={{ paddingRight: "44px", width: "100%" }} /><button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? "Hide password confirmation" : "Show password confirmation"} title={showConfirm ? "Hide password confirmation" : "Show password confirmation"} style={{ position: "absolute", right: "12px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)", padding: "4px" }}>{showConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>
        {error && <p className="field-error-text" role="alert">{error}</p>}
        <button className="btn btn-primary full-width" type="submit" disabled={loading}><ShieldCheck size={17} aria-hidden="true" />{loading ? "Saving…" : "Create password"}</button>
      </form>
    </section>
  </div>;
}
