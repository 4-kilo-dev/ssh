/**
 * List Details Service
 *
 * Adds the display details that list screens need (venue name/photo, hall
 * names, customer name, last message, unread count) in a few batched queries,
 * so clients do not have to make one extra request per row.
 *
 * Every function is additive: it returns the original records with extra
 * fields, never removing or renaming existing ones.
 *
 * Privacy: last-message content and unread counts are only attached for
 * conversations the viewer participates in (super_admin sees metadata only).
 */

import { and, desc, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  accounts,
  halls,
  inquiryMessages,
  venues,
  type InquiryConversation,
  type Venue,
} from "../db/schema";
import type { BookingWithHalls } from "./booking-service";

export interface VenueSummary {
  id: string;
  name: string;
  area: string;
  type: string;
  photo: string | null;
}

export interface PersonSummary {
  id: string;
  name: string;
  phone?: string;
}

function toVenueSummary(v: Venue): VenueSummary {
  return {
    id: v.id,
    name: v.name,
    area: v.area,
    type: v.type,
    photo: v.photos && v.photos.length > 0 ? v.photos[0] : null,
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

async function loadVenueSummaries(venueIds: string[]): Promise<Map<string, VenueSummary>> {
  const map = new Map<string, VenueSummary>();
  if (venueIds.length === 0) return map;
  const rows = await getDb().select().from(venues).where(inArray(venues.id, venueIds));
  for (const v of rows) map.set(v.id, toVenueSummary(v));
  return map;
}

async function loadPeople(
  accountIds: string[],
  withPhone: boolean
): Promise<Map<string, PersonSummary>> {
  const map = new Map<string, PersonSummary>();
  if (accountIds.length === 0) return map;
  const rows = await getDb()
    .select({ id: accounts.id, name: accounts.name, phone: accounts.phone })
    .from(accounts)
    .where(inArray(accounts.id, accountIds));
  for (const r of rows) {
    map.set(r.id, withPhone ? r : { id: r.id, name: r.name });
  }
  return map;
}

/**
 * Venue directory: adds hallCount and maxCapacity (largest hall) to each venue.
 */
export async function attachVenueStats(list: Venue[]) {
  if (list.length === 0) return [];

  const rows = await getDb()
    .select({ venueId: halls.venueId, capacity: halls.capacity })
    .from(halls)
    .where(inArray(halls.venueId, list.map((v) => v.id)));

  const stats = new Map<string, { hallCount: number; maxCapacity: number }>();
  for (const r of rows) {
    const s = stats.get(r.venueId) ?? { hallCount: 0, maxCapacity: 0 };
    s.hallCount += 1;
    s.maxCapacity = Math.max(s.maxCapacity, r.capacity);
    stats.set(r.venueId, s);
  }

  return list.map((v) => ({
    ...v,
    hallCount: stats.get(v.id)?.hallCount ?? 0,
    maxCapacity: stats.get(v.id)?.maxCapacity ?? 0,
  }));
}

/**
 * Bookings: adds `venue` summary and `hallNames`.
 * With includeCustomer (venue manager / admin views) also adds `customer`
 * { id, name, phone } so the manager can call the customer about the deposit.
 */
export async function attachBookingDetails(
  list: BookingWithHalls[],
  options: { includeCustomer: boolean }
) {
  if (list.length === 0) return [];

  const db = getDb();
  const venueMap = await loadVenueSummaries(unique(list.map((b) => b.venueId)));

  const hallIds = unique(list.flatMap((b) => b.halls.map((h) => h.hallId)));
  const hallMap = new Map<string, string>();
  if (hallIds.length > 0) {
    const hallRows = await db
      .select({ id: halls.id, name: halls.name })
      .from(halls)
      .where(inArray(halls.id, hallIds));
    for (const h of hallRows) hallMap.set(h.id, h.name);
  }

  const customerMap = options.includeCustomer
    ? await loadPeople(unique(list.map((b) => b.customerId)), true)
    : new Map<string, PersonSummary>();

  return list.map((b) => ({
    ...b,
    venue: venueMap.get(b.venueId) ?? null,
    hallNames: b.halls
      .map((h) => hallMap.get(h.hallId))
      .filter((name): name is string => Boolean(name)),
    ...(options.includeCustomer ? { customer: customerMap.get(b.customerId) ?? null } : {}),
  }));
}

/**
 * Conversations: adds `venue` summary and `customer` { id, name }.
 * For conversations the viewer takes part in, also adds `lastMessage` and
 * `unreadCount` (messages from the other side that the viewer has not opened).
 */
export async function attachConversationDetails(list: InquiryConversation[], viewerId: string) {
  if (list.length === 0) return [];

  const db = getDb();
  const venueMap = await loadVenueSummaries(unique(list.map((c) => c.venueId)));
  const customerMap = await loadPeople(unique(list.map((c) => c.customerId)), false);

  const participantIds = list
    .filter((c) => c.customerId === viewerId || c.managerId === viewerId)
    .map((c) => c.id);

  const lastMessageMap = new Map<string, { content: string; senderId: string; createdAt: Date }>();
  const unreadMap = new Map<string, number>();

  if (participantIds.length > 0) {
    const lastRows = await db
      .selectDistinctOn([inquiryMessages.conversationId], {
        conversationId: inquiryMessages.conversationId,
        content: inquiryMessages.content,
        senderId: inquiryMessages.senderId,
        createdAt: inquiryMessages.createdAt,
      })
      .from(inquiryMessages)
      .where(inArray(inquiryMessages.conversationId, participantIds))
      .orderBy(inquiryMessages.conversationId, desc(inquiryMessages.createdAt));

    for (const r of lastRows) {
      lastMessageMap.set(r.conversationId, {
        content: r.content,
        senderId: r.senderId,
        createdAt: r.createdAt,
      });
    }

    const unreadRows = await db
      .select({
        conversationId: inquiryMessages.conversationId,
        count: sql<number>`count(*)::int`,
      })
      .from(inquiryMessages)
      .where(
        and(
          inArray(inquiryMessages.conversationId, participantIds),
          ne(inquiryMessages.senderId, viewerId),
          isNull(inquiryMessages.readAt)
        )
      )
      .groupBy(inquiryMessages.conversationId);

    for (const r of unreadRows) unreadMap.set(r.conversationId, Number(r.count));
  }

  return list.map((c) => {
    const isParticipant = c.customerId === viewerId || c.managerId === viewerId;
    return {
      ...c,
      venue: venueMap.get(c.venueId) ?? null,
      customer: customerMap.get(c.customerId) ?? null,
      ...(isParticipant
        ? {
            lastMessage: lastMessageMap.get(c.id) ?? null,
            unreadCount: unreadMap.get(c.id) ?? 0,
          }
        : {}),
    };
  });
}
