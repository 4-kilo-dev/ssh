"use client";

/**
 * Filter state, predicate, sorting and option lists for the ?filters=v2 venue
 * browser (web sidebar and /tg bottom sheet). Nothing here runs unless the
 * v2 flag is on. Every venue field added for v2 is optional, so a venue that
 * lacks one (for example an admin-created venue) is treated as "unknown/false"
 * and never throws.
 */
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Booking, Venue } from "./mock-data";
import { emptyVenueFilters, matchesVenueFilters } from "./venues";

/** True when the URL carries ?filters=v2. */
export function useFiltersV2Flag(): boolean {
  return useSearchParams().get("filters") === "v2";
}

export type GuestBucketKey = "0-199" | "200-399" | "400-699" | "700-999" | "1000+";
export const GUEST_BUCKETS: { key: GuestBucketKey; min: number; max: number }[] = [
  { key: "0-199", min: 0, max: 199 },
  { key: "200-399", min: 200, max: 399 },
  { key: "400-699", min: 400, max: 699 },
  { key: "700-999", min: 700, max: 999 },
  { key: "1000+", min: 1000, max: Infinity },
];

export type SettingKey = "indoor" | "covered-outdoor" | "uncovered-outdoor";
export const SETTINGS: SettingKey[] = ["indoor", "covered-outdoor", "uncovered-outdoor"];

/** Normalized amenity tags, in display order. */
export const AMENITY_TAGS = [
  "catering", "bar", "cleanup", "planner", "rentals", "get-ready-rooms",
  "outside-vendors-allowed", "wifi", "parking", "backup-generator",
] as const;

export type QuickKey = "responds" | "popular" | "recommended";
export const QUICK_FILTERS: QuickKey[] = ["responds", "popular", "recommended"];

export type SortKey = "recommended" | "priceLow" | "priceHigh" | "capacityHigh" | "capacityLow" | "name";
export const SORT_KEYS: SortKey[] = ["recommended", "priceLow", "priceHigh", "capacityHigh", "capacityLow", "name"];

export type ViewMode = "list" | "images" | "map";
export const VIEW_MODES: ViewMode[] = ["list", "images", "map"];

/** The "Featured" badge only renders when a venue has `featured === true`. No venue does yet. */
export const isFeatured = (venue: Venue) => venue.featured === true;

/**
 * APPROXIMATE nearby-area map, hand-written for the owner to review.
 * Each key lists the areas treated as "nearby" when "Include nearby areas" is
 * on. Pairs are written once and mirrored below so the relation is symmetric.
 * Adjacency here is a rough guess from general Addis Ababa geography, not
 * measured distances.
 */
const NEARBY_PAIRS: [string, string][] = [
  ["Central Megenagna", "22 to Megenagna"],
  ["Central Megenagna", "22"],
  ["22 to Megenagna", "22"],
  ["Bole / Edna Mall", "Atlas"],
  ["Bole / Edna Mall", "Urael"],
  ["Bole / Edna Mall", "Berhane Adere Mall"],
  ["Atlas", "Urael"],
  ["Atlas", "Kazanchis"],
  ["Atlas", "Berhane Adere Mall"],
  ["Urael", "Kazanchis"],
  ["Kazanchis", "4 Kilo / Elizabeth Street"],
  ["Tor Hailoch", "Addisu Gebeya"],
];
const NEARBY_AREAS: Record<string, string[]> = {};
NEARBY_PAIRS.forEach(([a, b]) => {
  (NEARBY_AREAS[a] ??= []).push(b);
  (NEARBY_AREAS[b] ??= []).push(a);
});
export const nearbyAreas = (area: string): string[] => NEARBY_AREAS[area] ?? [];

/** Guest buckets a venue can host: its own list, else the bucket its capacity falls in. */
export function guestBucketsOf(venue: Venue): string[] {
  if (venue.guestBuckets?.length) return venue.guestBuckets;
  const capacity = Number(venue.capacity);
  if (!Number.isFinite(capacity) || capacity < 0) return [];
  const bucket = GUEST_BUCKETS.find((item) => capacity >= item.min && capacity <= item.max);
  return bucket ? [bucket.key] : [];
}

export const photoCountOf = (venue: Venue): number => venue.photoCount ?? venue.photos?.length ?? 0;

export type VenueFiltersV2State = {
  query: string; types: string[]; area: string; nearby: boolean; date: string;
  buckets: string[]; minimum: string; maximum: string;
  settings: string[]; amenities: string[];
  responds: boolean; popular: boolean; recommended: boolean;
};
export const emptyFiltersV2: VenueFiltersV2State = {
  query: "", types: [], area: "", nearby: false, date: "", buckets: [], minimum: "", maximum: "",
  settings: [], amenities: [], responds: false, popular: false, recommended: false,
};
type ListKey = "types" | "buckets" | "settings" | "amenities";

export function matchesFiltersV2(venue: Venue, bookings: Booking[], f: VenueFiltersV2State): boolean {
  // Date availability reuses the existing rule: pass a filters object with only the date set.
  if (!matchesVenueFilters(venue, bookings, { ...emptyVenueFilters, date: f.date })) return false;
  const query = f.query.trim().toLowerCase();
  if (query && !`${venue.name ?? ""} ${venue.area ?? ""} ${venue.type ?? ""} ${venue.description ?? ""}`.toLowerCase().includes(query)) return false;
  if (f.types.length && !f.types.includes(venue.type)) return false;
  if (f.area && venue.area !== f.area && !(f.nearby && nearbyAreas(f.area).includes(venue.area))) return false;
  if (f.buckets.length && !guestBucketsOf(venue).some((bucket) => f.buckets.includes(bucket))) return false;
  if (f.minimum !== "" && !(venue.price >= Number(f.minimum))) return false;
  if (f.maximum !== "" && !(venue.price <= Number(f.maximum))) return false;
  if (f.settings.length && !(venue.setting && f.settings.includes(venue.setting))) return false;
  if (f.amenities.length && !f.amenities.every((tag) => venue.amenityTags?.includes(tag))) return false;
  if (f.responds && venue.respondsWithin24h !== true) return false;
  if (f.popular && venue.popular !== true) return false;
  if (f.recommended && venue.recommended !== true) return false;
  return true;
}

export function sortVenuesV2(venues: Venue[], sort: SortKey): Venue[] {
  const rank = (venue: Venue) => (venue.recommended ? 2 : 0) + (venue.popular ? 1 : 0);
  const compare: Record<SortKey, (a: Venue, b: Venue) => number> = {
    recommended: (a, b) => rank(b) - rank(a),
    priceLow: (a, b) => a.price - b.price,
    priceHigh: (a, b) => b.price - a.price,
    capacityHigh: (a, b) => b.capacity - a.capacity,
    capacityLow: (a, b) => a.capacity - b.capacity,
    name: (a, b) => (a.name ?? "").localeCompare(b.name ?? ""),
  };
  // Index tie-break keeps the sort stable and the original order for equal values.
  return venues.map((venue, index) => ({ venue, index }))
    .sort((a, b) => compare[sort](a.venue, b.venue) || a.index - b.index)
    .map((item) => item.venue);
}

export function useVenueFiltersV2(venues: Venue[], bookings: Booking[], initial?: Partial<VenueFiltersV2State>) {
  const [filters, setFilters] = useState<VenueFiltersV2State>({ ...emptyFiltersV2, ...initial });
  const [sort, setSort] = useState<SortKey>("recommended");
  const [view, setView] = useState<ViewMode>("images");
  const update = useCallback(<K extends keyof VenueFiltersV2State>(key: K, value: VenueFiltersV2State[K]) => setFilters((current) => ({ ...current, [key]: value })), []);
  const toggle = useCallback((key: ListKey, value: string) => setFilters((current) => {
    const list = current[key];
    return { ...current, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
  }), []);
  const clear = useCallback(() => setFilters(emptyFiltersV2), []);
  const areas = useMemo(() => Array.from(new Set(venues.map((venue) => venue.area))), [venues]);
  const types = useMemo(() => Array.from(new Set(venues.map((venue) => venue.type))), [venues]);
  const results = useMemo(
    () => sortVenuesV2(venues.filter((venue) => matchesFiltersV2(venue, bookings, filters)), sort),
    [venues, bookings, filters, sort],
  );
  const activeCount = [filters.query, filters.area, filters.date, filters.minimum, filters.maximum, filters.responds, filters.popular, filters.recommended]
    .filter(Boolean).length + filters.types.length + filters.buckets.length + filters.settings.length + filters.amenities.length;
  return { filters, update, toggle, clear, areas, types, results, activeCount, sort, setSort, view, setView };
}
export type VenueFiltersV2Controller = ReturnType<typeof useVenueFiltersV2>;
