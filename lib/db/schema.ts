/**
 * Drizzle schema — single source of truth for the database structure.
 *
 * Phase 0: healthCheck table for pipeline verification.
 * Phase 1: accounts and credentials tables with identity-vs-credential separation.
 */
import { pgTable, serial, text, timestamp, uuid, pgEnum, boolean } from "drizzle-orm/pg-core";

// Phase 0: Health check table for pipeline verification
export const healthCheck = pgTable("health_check", {
  id: serial("id").primaryKey(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type HealthCheckRow = typeof healthCheck.$inferSelect;
export type NewHealthCheckRow = typeof healthCheck.$inferInsert;

// Phase 1: Account roles
export const accountRoleEnum = pgEnum("account_role", [
  "user",
  "venue_manager",
  "vendor",
  "super_admin",
]);

export type AccountRole = (typeof accountRoleEnum.enumValues)[number];

// Phase 1: Accounts table — identity anchor (phone + optional telegram_id)
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: accountRoleEnum("role").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  telegramId: text("telegram_id").unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

// Phase 1: Credentials table — separated 1:1 record holding hashed password
export const credentials = pgTable("credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" })
    .unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;
