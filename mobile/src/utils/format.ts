/**
 * Human-readable dates in English or Amharic (Gregorian calendar, like the
 * website's "am-ET-u-ca-gregory"). Built by hand so it does not depend on the
 * phone's Intl/ICU data and always shows Addis time.
 */
import type { Locale } from "@/i18n";
import { addisParts, dateOf, dayPartOf, hhmm, parseDate, todayAddis, addDays } from "./time";

const WEEKDAYS: Record<Locale, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  am: ["እሑድ", "ሰኞ", "ማክሰ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"],
};

const MONTHS_SHORT: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  am: ["ጃን", "ፌብ", "ማርች", "ኤፕሪ", "ሜይ", "ጁን", "ጁላይ", "ኦገስ", "ሴፕቴ", "ኦክቶ", "ኖቬም", "ዲሴም"],
};

const MONTHS_LONG: Record<Locale, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  am: ["ጃንዋሪ", "ፌብሩዋሪ", "ማርች", "ኤፕሪል", "ሜይ", "ጁን", "ጁላይ", "ኦገስት", "ሴፕቴምበር", "ኦክቶበር", "ኖቬምበር", "ዲሴምበር"],
};

export function weekdayShort(dateStr: string, locale: Locale): string {
  return WEEKDAYS[locale][parseDate(dateStr).weekday];
}

export function weekdayHeaders(locale: Locale): string[] {
  return WEEKDAYS[locale];
}

export function monthShort(dateStr: string, locale: Locale): string {
  return MONTHS_SHORT[locale][parseDate(dateStr).month];
}

/** "November 2026" */
export function formatMonthYear(dateStr: string, locale: Locale): string {
  const p = parseDate(dateStr);
  return `${MONTHS_LONG[locale][p.month]} ${p.year}`;
}

/** "Sat, 22 Nov 2026" (year omitted when it is this year) */
export function formatDate(dateStr: string, locale: Locale): string {
  const p = parseDate(dateStr);
  const thisYear = parseDate(todayAddis()).year;
  const year = p.year === thisYear ? "" : ` ${p.year}`;
  return `${WEEKDAYS[locale][p.weekday]}, ${p.day} ${MONTHS_SHORT[locale][p.month]}${year}`;
}

/**
 * "Sat, 22 Nov · Full day (08:00–22:00)" for presets,
 * "Sat, 22 Nov · 10:00–12:00" otherwise.
 */
export function formatWhen(
  startISO: string,
  endISO: string,
  locale: Locale,
  partLabel: (key: "fullDay" | "morning" | "evening") => string
): string {
  const day = formatDate(dateOf(startISO), locale);
  const range = `${hhmm(startISO)}–${hhmm(endISO)}`;
  const part = dayPartOf(startISO, endISO);
  if (dateOf(startISO) !== dateOf(endISO)) {
    return `${day} ${hhmm(startISO)} – ${formatDate(dateOf(endISO), locale)} ${hhmm(endISO)}`;
  }
  return part ? `${day} · ${partLabel(part)} (${range})` : `${day} · ${range}`;
}

/** Chat list time: "14:05" today, "Yesterday"-style weekday this week, else "22 Nov". */
export function formatChatTime(iso: string, locale: Locale): string {
  const date = dateOf(iso);
  const today = todayAddis();
  if (date === today) return hhmm(iso);
  if (date > addDays(today, -7)) return weekdayShort(date, locale);
  const p = addisParts(iso);
  return `${p.day} ${MONTHS_SHORT[locale][p.month]}`;
}
