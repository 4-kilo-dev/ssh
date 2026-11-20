"use client";

import Link from "next/link";
import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";

export default function NotFound() {
  const { locale } = useDemo();
  return (
    <section className="card not-found">
      <p className="eyebrow">404</p>
      <h1>{t("pageNotFound", locale)}</h1>
      <p>{t("notFoundDescription", locale)}</p>
      <Link className="btn btn-primary" href="/">
        {t("backHome", locale)}
      </Link>
    </section>
  );
}
