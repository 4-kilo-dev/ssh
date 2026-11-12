/**
 * Drizzle schema — single source of truth for the database structure.
 *
 * Phase 0 intentionally defines only a trivial `health_check` table. Its sole
 * purpose is to give the migration + round-trip harness something real to create
 * and query, proving the whole chain (Docker Postgres -> Drizzle -> migrations ->
 * query) works before any real domain tables are added in later phases.
 */
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
  id: serial("id").primaryKey(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HealthCheckRow = typeof healthCheck.$inferSelect;
export type NewHealthCheckRow = typeof healthCheck.$inferInsert;
