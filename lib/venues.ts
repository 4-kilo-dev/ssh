"use client";

/**
 * Venue presentation and filtering helpers shared by the web venue browser
 * (`components/CoreFlow.tsx`) and the /tg Telegram Mini App venue browser.
 *
 * These were moved out of CoreFlow so both surfaces run the exact same filter
 * predicate and the same label maps — the Mini App cannot drift from the web
 * app's filtering behaviour.
 */

import { useCallback, useMemo, useState } from "react";
import type { Booking, Venue } from "./mock-data";
import { t } from "./i18n";

const venueTypeKeys: Record<string, string> = { "Wedding hall": "venueWeddingHall", "Garden venue": "venueGarden", "Conference space": "venueConference", "Hotel ballroom": "venueBallroom" };
export const venueTypeLabel = (value: string, locale: "en" | "am") => t(venueTypeKeys[value] || "venue", locale);

const amenityKeys: Record<string, string> = { Parking: "amenityParking", Catering: "amenityCatering", Garden: "amenityGarden", Stage: "amenityStage", Projector: "amenityProjector", "Wi-Fi": "amenityWifi", "Accessible entry": "amenityAccessible", "Sound system": "amenitySound", "Changing room": "amenityChanging" };
export const amenityLabel = (value: string, locale: "en" | "am") => t(amenityKeys[value] || "amenityOther", locale);

export type VenueFilters = {
  query: string; area: string; date: string; capacity: string;
  minimum: string; maximum: string; type: string; amenity: string;
};

export const emptyVenueFilters: VenueFilters = { query: "", area: "", date: "", capacity: "", minimum: "", maximum: "", type: "", amenity: "" };

/** The web app's venue filter predicate, verbatim. */
export function matchesVenueFilters(venue: Venue, bookings: Booking[], filters: VenueFilters): boolean {
  const searchMatch = `${venue.name} ${venue.area} ${venue.type} ${venue.description}`.toLowerCase().includes(filters.query.toLowerCase());
  const held = filters.date && bookings.some((booking) => booking.venueId === venue.id && booking.eventDate === filters.date && (booking.status === "Reserved" || booking.status === "Confirmed"));
  return Boolean(searchMatch && (!filters.area || venue.area === filters.area) && (!filters.date || !held) && (!filters.capacity || venue.capacity >= Number(filters.capacity)) && (!filters.minimum || venue.price >= Number(filters.minimum)) && (!filters.maximum || venue.price <= Number(filters.maximum)) && (!filters.type || venue.type === filters.type) && (!filters.amenity || venue.amenities.includes(filters.amenity)));
}

/**
 * Filter state, option lists and results. The individual setters are returned
 * as named values so the web browser's existing JSX binds to them unchanged.
 */
export function useVenueFilters(venues: Venue[], bookings: Booking[], initial?: Partial<VenueFilters>) {
  const [filters, setFilters] = useState<VenueFilters>({ ...emptyVenueFilters, ...initial });
  const update = useCallback(<K extends keyof VenueFilters>(key: K, value: VenueFilters[K]) => setFilters((current) => ({ ...current, [key]: value })), []);
  const clear = useCallback(() => setFilters(emptyVenueFilters), []);

  const areas = useMemo(() => Array.from(new Set(venues.map((venue) => venue.area))), [venues]);
  const types = useMemo(() => Array.from(new Set(venues.map((venue) => venue.type))), [venues]);
  const amenities = useMemo(() => Array.from(new Set(venues.flatMap((venue) => venue.amenities))), [venues]);
  const filtered = useMemo(() => venues.filter((venue) => matchesVenueFilters(venue, bookings, filters)), [venues, bookings, filters]);
  const hasFilter = Boolean(filters.query || filters.area || filters.date || filters.capacity || filters.minimum || filters.maximum || filters.type || filters.amenity);

  return {
    filters, filtered, hasFilter, areas, types, amenities, clear,
    query: filters.query, setQuery: (value: string) => update("query", value),
    area: filters.area, setArea: (value: string) => update("area", value),
    date: filters.date, setDate: (value: string) => update("date", value),
    capacity: filters.capacity, setCapacity: (value: string) => update("capacity", value),
    minimum: filters.minimum, setMinimum: (value: string) => update("minimum", value),
    maximum: filters.maximum, setMaximum: (value: string) => update("maximum", value),
    type: filters.type, setType: (value: string) => update("type", value),
    amenity: filters.amenity, setAmenity: (value: string) => update("amenity", value),
  };
}
