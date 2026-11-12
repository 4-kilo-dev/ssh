/**
 * Drizzle schema — single source of truth for the database structure.
 *
 * Phase 0: healthCheck table for pipeline verification.
 * Phase 1: accounts and credentials tables with identity-vs-credential separation.
 */
import { pgTable, serial, text, timestamp, uuid, pgEnum, boolean, jsonb, integer, uniqueIndex } from "drizzle-orm/pg-core";

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

// Phase 2: Onboarding tokens — short-lived, single-use, signed tokens for setting initial password
export const onboardingTokens = pgTable("onboarding_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingToken = typeof onboardingTokens.$inferSelect;
export type NewOnboardingToken = typeof onboardingTokens.$inferInsert;

// Phase 2: Sessions table — database-backed server sessions with user-agent & last-seen tracking
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Phase 3: Venues table — owned by exactly one venue_manager
export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  managerId: uuid("manager_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" })
    .unique(),
  name: text("name").notNull(),
  area: text("area").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  policies: text("policies"),
  amenities: jsonb("amenities").$type<string[]>().default([]),
  photos: jsonb("photos").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;

// Phase 3: Hall settings enum
export const hallSettingEnum = pgEnum("hall_setting", [
  "indoor",
  "covered-outdoor",
  "uncovered-outdoor",
]);

export type HallSetting = (typeof hallSettingEnum.enumValues)[number];

// Phase 3: Halls table — the bookable unit under a venue
export const halls = pgTable(
  "halls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull(),
    setting: hallSettingEnum("setting").notNull().default("indoor"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("halls_venue_id_name_unique_idx").on(table.venueId, table.name),
  ]
);

export type Hall = typeof halls.$inferSelect;
export type NewHall = typeof halls.$inferInsert;

// Phase 4: Slot Claim Enums
export const slotClaimTypeEnum = pgEnum("slot_claim_type", [
  "block",
  "booking",
]);

export type SlotClaimType = (typeof slotClaimTypeEnum.enumValues)[number];

export const slotClaimStatusEnum = pgEnum("slot_claim_status", [
  "active",
  "released",
]);

export type SlotClaimStatus = (typeof slotClaimStatusEnum.enumValues)[number];

// Phase 4: Slot claims table — holds time claims for halls (manual blocks and booking claims)
// Protected by Postgres GIST exclusion constraint: no two active claims on the same hall may overlap
export const slotClaims = pgTable("slot_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  hallId: uuid("hall_id")
    .notNull()
    .references(() => halls.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  claimType: slotClaimTypeEnum("claim_type").notNull(),
  status: slotClaimStatusEnum("status").notNull().default("active"),
  reason: text("reason"),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SlotClaim = typeof slotClaims.$inferSelect;
export type NewSlotClaim = typeof slotClaims.$inferInsert;

// Phase 5: Booking Lifecycle Enums
export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "confirmed",
  "cancelled",
]);

export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

// Phase 5: Bookings table — requests made by customers for a venue over a time range
export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  status: bookingStatusEnum("status").notNull().default("requested"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  guestCount: integer("guest_count").notNull().default(0),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// Phase 5: Booking Halls junction table — atomic association between bookings and halls
export const bookingHalls = pgTable(
  "booking_halls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    hallId: uuid("hall_id")
      .notNull()
      .references(() => halls.id, { onDelete: "cascade" }),
    slotClaimId: uuid("slot_claim_id")
      .notNull()
      .references(() => slotClaims.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("booking_halls_booking_id_hall_id_unique_idx").on(
      table.bookingId,
      table.hallId
    ),
  ]
);

export type BookingHall = typeof bookingHalls.$inferSelect;
export type NewBookingHall = typeof bookingHalls.$inferInsert;

// Phase 6: Venue Inquiry Conversations — pre-booking communication channel
export const inquiryConversations = pgTable("inquiry_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  managerId: uuid("manager_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  subject: text("subject"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InquiryConversation = typeof inquiryConversations.$inferSelect;
export type NewInquiryConversation = typeof inquiryConversations.$inferInsert;

// Phase 6: Inquiry Messages — ordered message thread within a conversation
export const inquiryMessages = pgTable("inquiry_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => inquiryConversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InquiryMessage = typeof inquiryMessages.$inferSelect;
export type NewInquiryMessage = typeof inquiryMessages.$inferInsert;

// Phase 7: Append-Only Immutable Audit Log
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => accounts.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Phase 7: Support Ticket Status Enum
export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open",
  "in_progress",
  "resolved",
]);

export type SupportTicketStatus = (typeof supportTicketStatusEnum.enumValues)[number];

// Phase 7: Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: supportTicketStatusEnum("status").notNull().default("open"),
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
