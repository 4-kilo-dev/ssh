"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";

export function CustomerGate({ children }: { children: React.ReactNode }) {
  const { status: sessionStatus } = useSession();
  const { role, locale } = useDemo();

  if (sessionStatus === "checking") {
    return (
      <section className="card">
        <h1>Connecting your account…</h1>
        <p>Loading your backend account and customer data.</p>
      </section>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <section className="card access-denied">
        <LockKeyhole size={27} aria-hidden="true" />
        <h1>Sign in required</h1>
        <p>Sign in to view your bookings, inquiries, payments, and profile.</p>
        <Link className="btn btn-primary" href="/login">
          Sign in <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  if (role !== "customer") {
    return (
      <section className="card access-denied">
        <LockKeyhole size={27} aria-hidden="true" />
        <h1>{t("accessDenied", locale)}</h1>
        <p>You do not have permission to view this page.</p>
        <Link className="btn btn-primary" href="/">
          {t("backHome", locale)} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}

export function VendorGate({ children }: { children: React.ReactNode }) {
  const { role, locale } = useDemo();

  if (role !== "vendor") {
    return (
      <section className="card access-denied">
        <LockKeyhole size={27} aria-hidden="true" />
        <h1>{t("accessDenied", locale)}</h1>
        <p>You do not have permission to view this page.</p>
        <Link className="btn btn-primary" href="/">
          {t("backHome", locale)} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { role, locale } = useDemo();

  if (role !== "admin") {
    return (
      <section className="card access-denied">
        <LockKeyhole size={27} aria-hidden="true" />
        <h1>{t("accessDenied", locale)}</h1>
        <p>You do not have permission to view this page.</p>
        <Link className="btn btn-primary" href="/">
          {t("backHome", locale)} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}
