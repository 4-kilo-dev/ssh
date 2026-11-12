CREATE TYPE "public"."hall_setting" AS ENUM('indoor', 'covered-outdoor', 'uncovered-outdoor');--> statement-breakpoint
CREATE TABLE "halls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"setting" "hall_setting" DEFAULT 'indoor' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"contact_phone" text,
	"contact_email" text,
	"policies" text,
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_manager_id_unique" UNIQUE("manager_id")
);
--> statement-breakpoint
ALTER TABLE "halls" ADD CONSTRAINT "halls_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_manager_id_accounts_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "halls_venue_id_name_unique_idx" ON "halls" USING btree ("venue_id","name");