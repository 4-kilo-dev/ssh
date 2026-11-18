import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { bookingApi, chatApi, vendorApi, venueApi } from "./endpoints";
import { useAuth } from "@/auth/AuthProvider";
import { addDays, todayAddis } from "@/utils/time";

export { queryClient } from "./queryClient";

/** Query keys in one place so mutations can invalidate the right data. */
export const keys = {
  venues: (params: object) => ["venues", params] as const,
  venue: (id: string) => ["venue", id] as const,
  calendar: (id: string, from: string, to: string) => ["calendar", id, from, to] as const,
  calendarAll: (id: string) => ["calendar", id] as const,
  bookings: ["bookings"] as const,
  booking: (id: string) => ["booking", id] as const,
  chats: ["chats"] as const,
  chat: (id: string) => ["chat", id] as const,
  vendors: (params: object) => ["vendors", params] as const,
  vendor: (id: string) => ["vendor", id] as const,
  myVendors: ["myVendors"] as const,
};

/* ---------------- Venues ---------------- */

export function useVenues(params: { query?: string; guests?: number }) {
  return useQuery({ queryKey: keys.venues(params), queryFn: () => venueApi.list(params) });
}

export function useVenue(id: string | undefined) {
  return useQuery({
    queryKey: keys.venue(id ?? ""),
    queryFn: () => venueApi.get(id!),
    enabled: Boolean(id),
  });
}

/** The next 30 days of availability for a venue (customer view). */
export const BOOKING_WINDOW_DAYS = 30;

export function useVenueCalendar(id: string | undefined, from?: string, to?: string) {
  const start = from ?? todayAddis();
  const end = to ?? addDays(start, BOOKING_WINDOW_DAYS - 1);
  return useQuery({
    queryKey: keys.calendar(id ?? "", start, end),
    queryFn: () => venueApi.calendar(id!, start, end),
    enabled: Boolean(id),
  });
}

/** The signed-in manager's venue (each manager owns at most one venue). */
export function useMyVenue() {
  const { account } = useAuth();
  const query = useQuery({
    queryKey: keys.venues({ mine: account?.id }),
    queryFn: async () => {
      const all = await venueApi.list();
      return all.find((v) => v.managerId === account?.id) ?? null;
    },
    enabled: account?.role === "venue_manager",
  });
  return query;
}

/* ---------------- Bookings ---------------- */

export function useBookings() {
  const { account } = useAuth();
  return useQuery({ queryKey: keys.bookings, queryFn: bookingApi.list, enabled: Boolean(account) });
}

export function useBooking(id: string | undefined) {
  const { account } = useAuth();
  return useQuery({
    queryKey: keys.booking(id ?? ""),
    queryFn: () => bookingApi.get(id!),
    enabled: Boolean(id && account),
  });
}

/* ---------------- Chats ---------------- */

export function useChats(options: { poll?: boolean } = {}) {
  const { account } = useAuth();
  return useQuery({
    queryKey: keys.chats,
    queryFn: chatApi.list,
    enabled: Boolean(account),
    refetchInterval: options.poll ? 30_000 : false,
  });
}

export function useChat(id: string | undefined) {
  const { account } = useAuth();
  return useQuery({
    queryKey: keys.chat(id ?? ""),
    queryFn: () => chatApi.get(id!),
    enabled: Boolean(id && account),
    refetchInterval: 8_000,
  });
}

/* ---------------- Vendors ---------------- */

export function useVendors() {
  return useQuery({ queryKey: keys.vendors({}), queryFn: () => vendorApi.list() });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: keys.vendor(id ?? ""),
    queryFn: () => vendorApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useMyVendors() {
  const { account } = useAuth();
  return useQuery({ queryKey: keys.myVendors, queryFn: vendorApi.mine, enabled: Boolean(account) });
}

/* ---------------- Helpers ---------------- */

/** Pull-to-refresh state that only spins for a manual refresh, not background refetches. */
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}

/** Refetch when the screen comes back into focus (tabs stay mounted). Skips the first focus. */
export function useRefetchOnFocus(refetch: () => unknown, enabled = true) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (enabled) refetch();
    }, [enabled, refetch])
  );
}
