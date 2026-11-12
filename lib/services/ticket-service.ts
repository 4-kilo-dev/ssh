/**
 * Support Ticket Service — Phase 7
 *
 * Implements user support intake, routing, and super-admin resolution:
 * 1. Intake:
 *    - Customers and venue managers can submit tickets.
 *    - Defaults status to 'open'.
 *    - Logs an immutable audit event for creation.
 * 2. Scoped Visibility:
 *    - Ticket author can view and list their tickets.
 *    - Super Admin can view all tickets across the platform.
 *    - Non-admin foreign access is strictly rejected (403).
 * 3. Resolution Workflow:
 *    - Super Admin can transition status ('open' -> 'in_progress' -> 'resolved').
 *    - Resolution automatically captures `resolvedAt` timestamp.
 *    - Super Admin can append internal `adminNotes`.
 *    - Status transitions append immutable audit events.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  supportTickets,
  accounts,
  type SupportTicket,
  type SupportTicketStatus,
} from "../db/schema";
import { logAuditEvent } from "./audit-service";

export interface CreateTicketInput {
  authorId: string;
  category: string;
  subject: string;
  message: string;
}

export interface ListAllTicketsOptions {
  callerId: string;
  status?: SupportTicketStatus;
  limit?: number;
}

export interface UpdateTicketStatusInput {
  ticketId: string;
  callerId: string;
  status: SupportTicketStatus;
  adminNotes?: string;
}

/**
 * Creates a new support ticket submitted by an authenticated account.
 */
export async function createTicket(input: CreateTicketInput): Promise<SupportTicket> {
  const db = getDb();

  // Validate author exists
  const [author] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.authorId))
    .limit(1);

  if (!author) {
    throw new Error("Author account not found");
  }

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      authorId: input.authorId,
      category: input.category.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: "open",
    })
    .returning();

  await logAuditEvent({
    actorId: input.authorId,
    action: "ticket.created",
    targetType: "support_ticket",
    targetId: ticket.id,
    metadata: {
      category: ticket.category,
      subject: ticket.subject,
    },
  });

  return ticket;
}

/**
 * Retrieves a single support ticket by ID.
 * Authorized callers: ticket author OR super_admin.
 */
export async function getTicketById(
  ticketId: string,
  callerId: string
): Promise<SupportTicket | null> {
  const db = getDb();

  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);

  if (!ticket) {
    return null;
  }

  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, callerId))
    .limit(1);

  if (!caller) {
    throw new Error("Not authorized: caller account not found");
  }

  const isAuthor = ticket.authorId === callerId;
  const isAdmin = caller.role === "super_admin";

  if (!isAuthor && !isAdmin) {
    throw new Error("Not authorized: foreign users cannot view this ticket");
  }

  return ticket;
}

/**
 * Lists tickets authored by a specific account.
 */
export async function listTicketsForAccount(authorId: string): Promise<SupportTicket[]> {
  const db = getDb();

  return await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.authorId, authorId))
    .orderBy(desc(supportTickets.createdAt));
}

/**
 * Lists all support tickets across the platform.
 * Authorized callers: super_admin only.
 */
export async function listAllTickets(options: ListAllTicketsOptions): Promise<SupportTicket[]> {
  const db = getDb();

  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, options.callerId))
    .limit(1);

  if (!caller || caller.role !== "super_admin") {
    throw new Error("Not authorized: super_admin required to list all tickets");
  }

  const conditions = [];
  if (options.status) {
    conditions.push(eq(supportTickets.status, options.status));
  }

  const query = db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));

  if (conditions.length > 0) {
    return await query.where(and(...conditions)).limit(options.limit ?? 200);
  }

  return await query.limit(options.limit ?? 200);
}

/**
 * Updates a ticket's status and admin notes.
 * Authorized callers: super_admin only.
 */
export async function updateTicketStatus(
  input: UpdateTicketStatusInput
): Promise<SupportTicket> {
  const db = getDb();

  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, input.callerId))
    .limit(1);

  if (!caller || caller.role !== "super_admin") {
    throw new Error("Not authorized: super_admin required to update ticket status");
  }

  const [existing] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, input.ticketId))
    .limit(1);

  if (!existing) {
    throw new Error("Ticket not found");
  }

  const updateData: Partial<typeof supportTickets.$inferInsert> = {
    status: input.status,
    updatedAt: new Date(),
  };

  if (input.status === "resolved") {
    updateData.resolvedAt = new Date();
  }

  if (input.adminNotes !== undefined) {
    updateData.adminNotes = input.adminNotes;
  }

  const [updated] = await db
    .update(supportTickets)
    .set(updateData)
    .where(eq(supportTickets.id, input.ticketId))
    .returning();

  await logAuditEvent({
    actorId: input.callerId,
    action: "ticket.status_updated",
    targetType: "support_ticket",
    targetId: input.ticketId,
    metadata: {
      status: input.status,
      adminNotes: input.adminNotes,
    },
  });

  return updated;
}
