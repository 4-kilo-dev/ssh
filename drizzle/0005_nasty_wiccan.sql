CREATE TYPE "public"."slot_claim_status" AS ENUM('active', 'released');--> statement-breakpoint
CREATE TYPE "public"."slot_claim_type" AS ENUM('block', 'booking');--> statement-breakpoint
CREATE TABLE "slot_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hall_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"claim_type" "slot_claim_type" NOT NULL,
	"status" "slot_claim_status" DEFAULT 'active' NOT NULL,
	"reason" text,
	"created_by_id" uuid NOT NULL,
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_created_by_id_accounts_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_no_overlap" EXCLUDE USING gist (hall_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&) WHERE (status = 'active');