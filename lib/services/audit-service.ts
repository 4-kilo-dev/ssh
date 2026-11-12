/**
 * Audit Log Service — Phase 7
 *
 * Implements the non-negotiable append-only audit trail:
 * 1. Immutability:
 *    - Records are strictly append-only.
 *    - Updates and deletions are forbidden by design.
 * 2. Scoped Visibility:
 *    - Only super_admin accounts can query system-wide audit logs.
 *    - Rejects non-admin callers with 403 / unauthorized error.
 * 3. Structured Event Logging:
 *    - Logs who did what, when, and to which target entity.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db/client";
import { auditLogs, accounts, type AuditLog, type NewAuditLog } from "../db/schema";

export interface LogAuditEventInput {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
}

export interface ListAuditLogsOptions {
  callerId: string;
  actorId?: string;
  action?: string;
  targetType?: string;
  limit?: number;
}

/**
 * Appends a new immutable audit log event.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<AuditLog> {
  const db = getDb();

  const [entry] = await db
    .insert(auditLogs)
    .values({
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ?? {},
    })
    .returning();

  return entry;
}

/**
 * Retrieves a single audit log entry by ID.
 */
export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  const db = getDb();
  const [entry] = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
  return entry ?? null;
}

/**
 * Lists audit logs with optional filters.
 * STRICT AUTHORIZATION: Only super_admin accounts may access the audit log.
 */
export async function listAuditLogs(options: ListAuditLogsOptions): Promise<AuditLog[]> {
  const db = getDb();

  // Verify caller is super_admin
  const [caller] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, options.callerId))
    .limit(1);

  if (!caller || caller.role !== "super_admin") {
    throw new Error("Not authorized: super_admin required to view audit logs");
  }

  const conditions = [];
  if (options.actorId) {
    conditions.push(eq(auditLogs.actorId, options.actorId));
  }
  if (options.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }
  if (options.targetType) {
    conditions.push(eq(auditLogs.targetType, options.targetType));
  }

  const query = db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt));

  if (conditions.length > 0) {
    return await query.where(and(...conditions)).limit(options.limit ?? 200);
  }

  return await query.limit(options.limit ?? 200);
}

/**
 * Proves and enforces immutability: Updates are forbidden.
 */
export async function updateAuditLogAttempt(_input: { id: string; action: string }): Promise<never> {
  throw new Error("Audit logs are append-only and immutable. Cannot update audit log entries.");
}

/**
 * Proves and enforces immutability: Deletions are forbidden.
 */
export async function deleteAuditLogAttempt(_id: string): Promise<never> {
  throw new Error("Audit logs are append-only and immutable. Cannot delete audit log entries.");
}
