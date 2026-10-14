"use client";

import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";

export function LocaleLoading() {
  const { locale } = useDemo();
  return <div className="card" role="status">{t("loading", locale)}</div>;
}
