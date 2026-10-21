"use client";
/**
 * Filter state, predicate, sorting and option lists for the ?filters=v2 venue
 * browser (web sidebar and /tg bottom sheet). It composes the existing
 * `matchesVenueFilters` for search, date availability and price so those rules
 * cannot drift, and adds the new filters on top. Nothing here is used unless
 * the v2 flag is on.
 */
import { useCallback, useMemo, useState } from "react";
import type { Booking, GuestBucket, Venue, VenueAmenityKey, VenueSetting } from "./mock-data";
import { emptyVenueFilters, matchesVenueFilters } from "./venues";

/** The "Featured" badge is built but switched off until featured placement launches. */
export const FEATURED_BADGE_ACTIVE = false;

export const GUEST_BUCKETS: { key: GuestBucket; min: number; max: number; label: string }[] = [
  { key: "0-199", min: 0, max: 199, label: "0–199" },
  { key: "200-399", min: 200, max: 399, label: "200–399" },
  { key: "400-699", min: 400, max: 699, label: "400–699" },
  { key: "700-999", min: 700, max: 999, label: "700–999" },
  { key: "1000+", min: 1000, max: Infinity, label: "1000+" },
];
export const SETTINGS: VenueSetting[] = ["indoor", "covered-outdoor", "uncovered-outdoor"];
export const AMENITY_KEYS: VenueAmenityKey[] = ["catering", "bar", "cleanup", "planner", "rentals", "getReady", "outsideVendors", "wifi", "parking", "generator"];
export type SortKey = "best" | "priceLow" | "priceHigh" | "capacityHigh" | "capacityLow" | "name";
export const SORT_KEYS: SortKey[] = ["best", "priceLow", "priceHigh", "capacityHigh", "capacityLow", "name"];
export type ViewMode = "list" | "images" | "map";
export const VIEW_MODES: ViewMode[] = ["list", "images", "map"];

/** Areas that sit close together in the mock data. Used by "Include nearby areas". */
const NEARBY_GROUPS: string[][] = [
  ["Central Megenagna", "22 to Megenagna", "22"],
  ["Kazanchis", "Urael", "Atlas", "Bole / Edna Mall"],
];
export function nearbyAreas(area: string): string[] {
  return NEARBY_GROUPS.find((group) => group.includes(area))?.filter((item) => item !== area) ?? [];
}

export function guestBucketOf(venue: Venue): GuestBucket {
  if (venue.guestBucket) return venue.guestBucket;
  return (GUEST_BUCKETS.find((bucket) => venue.capacity >= bucket.min && venue.capacity <= bucket.max) ?? GUEST_BUCKETS[GUEST_BUCKETS.length - 1]).key;
}
export const photoCountOf = (venue: Venue) => venue.photoCount ?? venue.photos?.length ?? 1;

export type DiscoveryFilters = {
  query: string; types: string[]; area: string; nearby: boolean; date: string;
  buckets: GuestBucket[]; minimum: string; maximum: string;
  settings: VenueSetting[]; amenities: VenueAmenityKey[];
  responds: boolean; popular: boolean; recommended: boolean;
};
export const emptyDiscoveryFilters: DiscoveryFilters = {
  query: "", types: [], area: "", nearby: false, date: "", buckets: [], minimum: "", maximum: "",
  settings: [], amenities: [], responds: false, popular: false, recommended: false,
};
type ListKey = "types" | "buckets" | "settings" | "amenities";

export function matchesDiscoveryFilters(venue: Venue, bookings: Booking[], f: DiscoveryFilters): boolean {
  if (!matchesVenueFilters(venue, bookings, { ...emptyVenueFilters, query: f.query, date: f.date, minimum: f.minimum, maximum: f.maximum })) return false;
  if (f.area && venue.area !== f.area && !(f.nearby && nearbyAreas(f.area).includes(venue.area))) return false;
  if (f.types.length && !f.types.includes(venue.type)) return false;
  if (f.buckets.length && !f.buckets.includes(guestBucketOf(venue))) return false;
  if (f.settings.length && !(venue.setting && f.settings.includes(venue.setting))) return false;
  if (f.amenities.length && !f.amenities.every((key) => venue.amenityKeys?.includes(key))) return false;
  if (f.responds && !venue.respondsWithin24h) return false;
  if (f.popular && !venue.popular) return false;
  if (f.recommended && !venue.recommended) return false;
  return true;
}

export function sortVenues(venues: Venue[], sort: SortKey): Venue[] {
  const indexed = venues.map((venue, index) => ({ venue, index }));
  const score = (venue: Venue) => (venue.recommended ? 2 : 0) + (venue.popular ? 1 : 0);
  const compare: Record<SortKey, (a: Venue, b: Venue) => number> = {
    best: (a, b) => score(b) - score(a),
    priceLow: (a, b) => a.price - b.price,
    priceHigh: (a, b) => b.price - a.price,
    capacityHigh: (a, b) => b.capacity - a.capacity,
    capacityLow: (a, b) => a.capacity - b.capacity,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return indexed.sort((a, b) => compare[sort](a.venue, b.venue) || a.index - b.index).map((item) => item.venue);
}

export function useVenueDiscoveryV2(venues: Venue[], bookings: Booking[], initial?: Partial<DiscoveryFilters>) {
  const [filters, setFilters] = useState<DiscoveryFilters>({ ...emptyDiscoveryFilters, ...initial });
  const [sort, setSort] = useState<SortKey>("best");
  const [view, setView] = useState<ViewMode>("list");
  const update = useCallback(<K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => setFilters((current) => ({ ...current, [key]: value })), []);
  const toggle = useCallback((key: ListKey, value: string) => setFilters((current) => {
    const list = current[key] as string[];
    return { ...current, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
  }), []);
  const clear = useCallback(() => setFilters(emptyDiscoveryFilters), []);
  const areas = useMemo(() => Array.from(new Set(venues.map((venue) => venue.area))), [venues]);
  const types = useMemo(() => Array.from(new Set(venues.map((venue) => venue.type))), [venues]);
  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    venues.forEach((venue) => { const key = guestBucketOf(venue); counts[key] = (counts[key] ?? 0) + 1; });
    return counts;
  }, [venues]);
  const results = useMemo(() => sortVenues(venues.filter((venue) => matchesDiscoveryFilters(venue, bookings, filters)), sort), [venues, bookings, filters, sort]);
  const activeCount = [
    filters.query, filters.area, filters.date, filters.minimum, filters.maximum,
    filters.responds, filters.popular, filters.recommended,
  ].filter(Boolean).length + filters.types.length + filters.buckets.length + filters.settings.length + filters.amenities.length;
  return { filters, update, toggle, clear, areas, types, bucketCounts, results, activeCount, sort, setSort, view, setView };
}
