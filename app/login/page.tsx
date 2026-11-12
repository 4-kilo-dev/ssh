"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, LogOut, ShieldAlert, UserCheck } from "lucide-react";

interface Account {
  id: string;
  name: string;
  phone: string;
  role: string;
  telegramId?: string | null;
}

export default function LoginPage() {
  const [phone, setPhone] = useState("+251911223344");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  // Check existing session on load
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status === "authenticated" && data.account) {
          setAccount(data.account);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setAccount(data.account);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAccount(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-stack narrow-form">
      <header className="page-heading">
        <p className="eyebrow">
          <Lock size={14} aria-hidden="true" />
          <span>Account Authentication</span>
        </p>
        <h1>{account ? "Your Account" : "Sign In"}</h1>
        <p>
          {account
            ? "You currently have an active server-verified session."
            : "Sign in with your phone number and password to manage bookings and venues."}
        </p>
      </header>

      {account ? (
        <div className="card form-card">
          <div
            className="demo-notice"
            style={{
              borderColor: "var(--teal)",
              borderLeftColor: "var(--teal)",
              background: "var(--teal-soft)",
              color: "var(--teal-dark)",
            }}
          >
            <UserCheck size={20} aria-hidden="true" style={{ marginTop: "2px", flexShrink: 0 }} />
            <div>
              <strong>Authenticated Session</strong>
              <p style={{ color: "var(--ink)", marginTop: "4px" }}>
                Logged in as <strong>{account.name}</strong> ({account.phone}).
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              background: "var(--paper)",
              borderRadius: "10px",
              border: "1px solid var(--line)",
            }}
          >
            <dl style={{ display: "grid", gap: "10px", margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt className="muted">Name</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{account.name}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt className="muted">Phone</dt>
                <dd style={{ margin: 0, fontFamily: "monospace" }}>{account.phone}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt className="muted">Role</dt>
                <dd style={{ margin: 0 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      background: "var(--teal-soft)",
                      color: "var(--teal)",
                    }}
                  >
                    {account.role}
                  </span>
                </dd>
              </div>
              {account.telegramId && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt className="muted">Telegram ID</dt>
                  <dd style={{ margin: 0, fontFamily: "monospace" }}>{account.telegramId}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="form-actions" style={{ marginTop: "24px" }}>
            <button type="button" onClick={handleLogout} className="btn btn-secondary">
              <LogOut size={16} aria-hidden="true" />
              Sign Out
            </button>
            <Link href="/" className="btn btn-primary">
              Return Home <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <form className="card form-card" onSubmit={handleLogin} noValidate>
          {error && (
            <div className="conflict-alert" role="alert" style={{ marginBottom: "16px" }}>
              <ShieldAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Authentication Failed</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="login-phone">
              Phone Number <span aria-hidden="true">*</span>
            </label>
            <input
              id="login-phone"
              className="field"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              placeholder="+251..."
            />
          </div>

          <div style={{ marginTop: "16px" }}>
            <label className="label" htmlFor="login-password">
              Password <span aria-hidden="true">*</span>
            </label>
            <input
              id="login-password"
              className="field"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
            />
          </div>

          <p className="small-note" style={{ marginTop: "12px" }}>
            New user onboarded via Telegram? Click the onboarding link sent by the bot to set your password.
          </p>

          <div className="form-actions" style={{ marginTop: "24px" }}>
            <Link href="/" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !phone || !password}
            >
              {loading ? "Signing in..." : "Sign In"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
