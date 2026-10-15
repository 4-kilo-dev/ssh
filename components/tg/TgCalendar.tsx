"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { VenueCalendarSlotProps } from "@/components/CoreFlow";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatDate, formatMonthYear, intlLocale } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

/** Locale's first day of week, converted to JS getDay() numbering (0 = Sunday). */
function firstDayOfWeek(locale: string): number {
  try {
    const info = (new Intl.Locale(locale) as unknown as { weekInfo?: { firstDay?: number } }).weekInfo;
    const firstDay = info?.firstDay ?? 7; // 1 = Monday … 7 = Sunday
    return firstDay === 7 ? 0 : firstDay;
  } catch {
    return 0;
  }
}

/**
 * Compact month calendar with an agenda list underneath, used on the Mini App
 * venue detail in place of the web sidebar grid.
 *
 * The agenda deliberately shows no more than the web app's calendar does: other
 * customers appear only as a held (Reserved/Confirmed) date, never as a bare
 * request and never by name. Your own requests are labelled and shown in full.
 */
export function TgCalendar({ selectedDate, onSelectDate, heldDates, venueId }: VenueCalendarSlotProps) {
  const { locale, bookings, customers } = useDemo();
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const monthStart = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const weekStart = firstDayOfWeek(intlLocale(locale));
  const lead = (new Date(cursor.year, cursor.month, 1).getDay() - weekStart + 7) % 7;

  const customerName = customers.find((item) => item.id === "customer-1")?.name || "Hana Bekele";
  const monthKey = `${cursor.year}-${pad(cursor.month + 1)}`;
  const agenda = bookings
    .filter((booking) => booking.venueId === venueId && booking.eventDate.startsWith(monthKey))
    .filter((booking) => booking.customer === customerName || booking.status === "Reserved" || booking.status === "Confirmed")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(intlLocale(locale), { weekday: "narrow" })
      .format(new Date(2024, 0, 7 + index + weekStart))); // 2024-01-07 was a Sunday

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return <div className="tg-calendar">
    <div className="tg-calendar-head">
      <button type="button" className="tg-icon-btn" onClick={() => shiftMonth(-1)} aria-label={t("previousMonth", locale)}>
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <strong>{formatMonthYear(monthStart, locale)}</strong>
      <button type="button" className="tg-icon-btn" onClick={() => shiftMonth(1)} aria-label={t("nextMonth", locale)}>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>

    <div className="tg-calendar-weekdays" aria-hidden="true">
      {weekdays.map((weekday, index) => <span key={index}>{weekday}</span>)}
    </div>

    <div className="tg-calendar-grid" role="group" aria-label={t("availability", locale)}>
      {Array.from({ length: lead }, (_, index) => <span className="tg-calendar-blank" key={`lead-${index}`} />)}
      {Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = dateKey(cursor.year, cursor.month, day);
        const held = heldDates.includes(date);
        return <button
          key={date}
          type="button"
          className="tg-calendar-day"
          disabled={held || date < todayKey}
          aria-pressed={selectedDate === date}
          aria-label={`${formatDate(date, locale)}${held ? ` — ${t("reserved", locale)}` : ""}`}
          onClick={() => onSelectDate(date)}
        >{day}</button>;
      })}
    </div>

    <p className="availability-legend">
      <span className="legend-dot open" />{t("dateOpen", locale)} <span className="legend-dot held" />{t("reserved", locale)}
    </p>

    <h3 className="tg-agenda-title">{t("calendarAgenda", locale)}</h3>
    {agenda.length === 0
      ? <p className="muted">{t("noBookings", locale)}</p>
      : <ul className="tg-agenda">
          {agenda.map((booking) => <li className="tg-agenda-item" key={booking.id}>
            <span className="tg-agenda-date">{formatDate(booking.eventDate, locale)}</span>
            <StatusBadge status={booking.status} locale={locale} />
            {booking.customer === customerName && <span className="tag">{t("tgYourRequest", locale)}</span>}
          </li>)}
        </ul>}
  </div>;
}
