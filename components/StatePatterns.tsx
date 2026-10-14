"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, SearchX } from "lucide-react";
import { t, type CopyKey, type Locale } from "@/lib/i18n";

export type FormStatus = "idle" | "loading" | "success" | "error";
export function FormState({ status, locale, message, children }: { status: FormStatus; locale: Locale; message?: string; children?: ReactNode }) {
  const label = status === "loading" ? t("formLoading", locale) : status === "success" ? (message || t("formSuccess", locale)) : status === "error" ? (message || t("formError", locale)) : message;
  return <div aria-live="polite" aria-atomic="true" className="space-y-3">
    {label && <div role={status === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${status === "error" ? "border-red-200 bg-red-50 text-red-900" : status === "success" ? "border-green-200 bg-green-50 text-green-900" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
      {status === "loading" ? <LoaderCircle size={18} className="mt-0.5 animate-spin" aria-hidden="true" /> : status === "error" ? <AlertCircle size={18} className="mt-0.5" aria-hidden="true" /> : status === "success" ? <CheckCircle2 size={18} className="mt-0.5" aria-hidden="true" /> : null}
      <span>{label}</span>
    </div>}
    {children}
  </div>;
}

export function ListState({ locale, items, loading = false, noResults = false, children, emptyKey = "listEmpty", noResultsKey = "listNoResults" }: {
  locale: Locale; items: number; loading?: boolean; noResults?: boolean; children?: ReactNode;
  emptyKey?: CopyKey; noResultsKey?: CopyKey;
}) {
  if (loading) return <div role="status" className="card flex items-center gap-3 text-slate-600"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />{t("listLoading", locale)}</div>;
  if (items === 0 && noResults) return <div className="card text-center text-slate-600"><SearchX className="mx-auto mb-2" aria-hidden="true" />{t(noResultsKey, locale)}</div>;
  if (items === 0) return <div className="card text-center text-slate-600"><SearchX className="mx-auto mb-2" aria-hidden="true" />{t(emptyKey, locale)}</div>;
  return <>{children}</>;
}
