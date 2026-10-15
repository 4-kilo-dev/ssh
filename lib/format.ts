import type { Locale } from "./i18n";

export const intlLocale = (locale: Locale) => locale === "am" ? "am-ET-u-ca-gregory" : "en-ET-u-ca-gregory";

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(value);
}

export function formatETB(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency", currency: "ETB", currencyDisplay: "code", maximumFractionDigits: 0,
  }).format(value);
}

export function formatMonthYear(value: string | Date, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(date);
}

export function formatDate(value: string | Date, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" }).format(date);
}
