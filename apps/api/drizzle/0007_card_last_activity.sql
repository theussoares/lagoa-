ALTER TABLE "loyalty_cards" ADD COLUMN "last_activity_at" timestamp with time zone;--> statement-breakpoint
UPDATE "loyalty_cards" SET "last_activity_at" = "last_visit_at" WHERE "last_visit_at" IS NOT NULL;
