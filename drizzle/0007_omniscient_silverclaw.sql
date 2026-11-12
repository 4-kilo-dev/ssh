CREATE TABLE "inquiry_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"subject" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiry_conversations" ADD CONSTRAINT "inquiry_conversations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_conversations" ADD CONSTRAINT "inquiry_conversations_customer_id_accounts_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_conversations" ADD CONSTRAINT "inquiry_conversations_manager_id_accounts_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_conversation_id_inquiry_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."inquiry_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_sender_id_accounts_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;