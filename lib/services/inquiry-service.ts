/**
 * Inquiry Conversation Service — Phase 6
 *
 * Implements the pre-booking messaging channel between customers and venue managers:
 * 1. Scope & Attribution:
 *    - Each conversation is tied to a customer, a venue, and the owning venue manager.
 *    - Every message is explicitly attributed to its sender (customer or manager).
 *    - Messages are returned in strict ascending chronological order.
 * 2. Privacy & Read/Write Invariants:
 *    - Only conversation participants (customer and owning venue manager) can send messages.
 *    - Only participants can read private message content.
 *    - Super admin can inspect conversation metadata (threads, participants, audit),
 *      but private message contents are strictly excluded/restricted.
 *    - Foreign accounts are rejected with 403 / unauthorized error.
 */

import { eq, or, asc, desc } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  inquiryConversations,
  inquiryMessages,
  venues,
  accounts,
  type InquiryConversation,
  type InquiryMessage,
} from "../db/schema";
import { getVenueById } from "./venue-service";

export interface CreateConversationInput {
  venueId: string;
  customerId: string;
  subject?: string;
  initialMessage: string;
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
}

export interface GetConversationInput {
  conversationId: string;
  callerId: string;
}

export interface GetConversationMessagesInput {
  conversationId: string;
  callerId: string;
}

/**
 * Initiates an inquiry conversation with an initial message.
 */
export async function createConversation(input: CreateConversationInput): Promise<InquiryConversation> {
  const trimmedMessage = input.initialMessage?.trim();
  if (!trimmedMessage) {
    throw new Error("Message content cannot be empty or blank");
  }

  const db = getDb();

  // Validate customer existence
  const [customer] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.customerId))
    .limit(1);

  if (!customer) {
    throw new Error("Customer account not found");
  }

  // Validate venue existence and get manager
  const venue = await getVenueById(input.venueId);
  if (!venue) {
    throw new Error("Venue not found");
  }

  return await db.transaction(async (tx) => {
    // 1. Create conversation record
    const [conv] = await tx
      .insert(inquiryConversations)
      .values({
        venueId: input.venueId,
        customerId: input.customerId,
        managerId: venue.managerId,
        subject: input.subject?.trim() ?? null,
      })
      .returning();

    // 2. Insert initial message
    await tx
      .insert(inquiryMessages)
      .values({
        conversationId: conv.id,
        senderId: input.customerId,
        content: trimmedMessage,
      });

    return conv;
  });
}

/**
 * Sends a reply message within an existing conversation.
 * Strictly limited to the conversation's customer and manager.
 */
export async function sendMessage(input: SendMessageInput): Promise<InquiryMessage> {
  const trimmed = input.content?.trim();
  if (!trimmed) {
    throw new Error("Message content cannot be empty or blank");
  }

  const db = getDb();

  const [conv] = await db
    .select()
    .from(inquiryConversations)
    .where(eq(inquiryConversations.id, input.conversationId))
    .limit(1);

  if (!conv) {
    throw new Error("Conversation not found");
  }

  const isCustomer = conv.customerId === input.senderId;
  const isManager = conv.managerId === input.senderId;

  if (!isCustomer && !isManager) {
    throw new Error("Not authorized: Only conversation participants can send messages");
  }

  return await db.transaction(async (tx) => {
    const [msg] = await tx
      .insert(inquiryMessages)
      .values({
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: trimmed,
      })
      .returning();

    // Update conversation updatedAt timestamp
    await tx
      .update(inquiryConversations)
      .set({ updatedAt: new Date() })
      .where(eq(inquiryConversations.id, input.conversationId));

    return msg;
  });
}

/**
 * Retrieves conversation metadata.
 * Allowed for: participating customer, participating venue manager, or super_admin.
 */
export async function getConversationById(input: GetConversationInput): Promise<InquiryConversation | null> {
  const db = getDb();

  const [conv] = await db
    .select()
    .from(inquiryConversations)
    .where(eq(inquiryConversations.id, input.conversationId))
    .limit(1);

  if (!conv) {
    return null;
  }

  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.callerId))
    .limit(1);

  const isCustomer = conv.customerId === input.callerId;
  const isManager = conv.managerId === input.callerId;
  const isAdmin = caller?.role === "super_admin";

  if (!isCustomer && !isManager && !isAdmin) {
    throw new Error("Not authorized: You do not have permission to view this conversation");
  }

  return conv;
}

/**
 * Retrieves message transcript for a conversation in chronological order.
 * PRIVACY INVARIANT: Private message content is restricted strictly to the participating customer and manager.
 * Super admin and foreign callers are rejected.
 */
export async function getConversationMessages(input: GetConversationMessagesInput): Promise<InquiryMessage[]> {
  const db = getDb();

  const [conv] = await db
    .select()
    .from(inquiryConversations)
    .where(eq(inquiryConversations.id, input.conversationId))
    .limit(1);

  if (!conv) {
    throw new Error("Conversation not found");
  }

  const isCustomer = conv.customerId === input.callerId;
  const isManager = conv.managerId === input.callerId;

  if (!isCustomer && !isManager) {
    throw new Error("Not authorized: Private message contents are restricted to conversation participants");
  }

  return await db
    .select()
    .from(inquiryMessages)
    .where(eq(inquiryMessages.conversationId, input.conversationId))
    .orderBy(asc(inquiryMessages.createdAt));
}

/**
 * Lists conversations scoped to the authenticated account.
 * - Customer: returns conversations they initiated.
 * - Venue Manager: returns conversations for venues they manage.
 * - Super Admin: returns all conversations (metadata level).
 */
export async function listConversationsForAccount(accountId: string): Promise<InquiryConversation[]> {
  const db = getDb();

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account) {
    throw new Error("Account not found");
  }

  if (account.role === "venue_manager") {
    return await db
      .select()
      .from(inquiryConversations)
      .where(eq(inquiryConversations.managerId, accountId))
      .orderBy(desc(inquiryConversations.updatedAt));
  }

  if (account.role === "super_admin") {
    return await db
      .select()
      .from(inquiryConversations)
      .orderBy(desc(inquiryConversations.updatedAt));
  }

  // Default: customer
  return await db
    .select()
    .from(inquiryConversations)
    .where(eq(inquiryConversations.customerId, accountId))
    .orderBy(desc(inquiryConversations.updatedAt));
}
