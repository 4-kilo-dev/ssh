"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Lock, LogOut, ShieldAlert, UserCheck } from "lucide-react";
import { useSession } from "@/components/SessionProvider";

interface Account {
  id: string;
  name: string;
  phone: string;
  role: string;
  telegramId?: string | null;
}

function getRoleRedirectPath(role?: string): string {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      return redirect;
    }
  }

  switch (role) {
    case "super_admin":
      return "/admin";
    case "venue_manager":
      return "/manager/venue";
    case "vendor":
      return "/vendors";
    case "user":
    default:
      return "/venues";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { refresh: refreshSession } = useSession();
  const [phone, setPhone] = useState("+251911000000");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  // Check existing session on load — automatically redirect to respective homepage
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status === "authenticated" && data.account) {
          setAccount(data.account);
          const target = getRoleRedirectPath(data.account.role);
          router.replace(target);
        }
      })
      .catch(() => {});
  }, [router]);

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
      await refreshSession();

      // Automatically route to their respective homepage by role
      const target = getRoleRedirectPath(data.account?.role);
      router.push(target);
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
      await refreshSession();
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
        <h1>{account ? "Redirecting..." : "Sign In"}</h1>
        <p>
          {account
            ? "Redirecting you to your homepage..."
            : "Sign in with your phone number and password to manage bookings and venues."}
        </p>
      </header>

      {account ? (
        <div className="card form-card" style={{ textAlign: "center", padding: "32px" }}>
          <UserCheck size={36} style={{ color: "var(--teal)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "18px", margin: "0 0 8px" }}>Redirecting to your homepage...</h2>
          <p style={{ color: "var(--muted)", margin: "0 0 20px", fontSize: "14px" }}>
            Signed in as <strong>{account.name}</strong> ({account.role}).
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <Link href={getRoleRedirectPath(account.role)} className="btn btn-primary">
              Continue to {account.role === "super_admin" ? "Admin Dashboard" : account.role === "venue_manager" ? "Venue Workspace" : account.role === "vendor" ? "Vendors Directory" : "Venues"} &rarr;
            </Link>
            <button type="button" onClick={handleLogout} className="btn btn-secondary">
              <LogOut size={16} aria-hidden="true" />
              Sign Out
            </button>
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
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="login-password"
                className="field"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                style={{ paddingRight: "44px", width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--muted)",
                  padding: "4px",
                }}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: "24px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !phone || !password}
              style={{ marginLeft: "auto" }}
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
