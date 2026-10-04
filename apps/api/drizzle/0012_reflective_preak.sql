ALTER TABLE "customer_profiles" ADD COLUMN "ranking_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "ranking_name" text;--> statement-breakpoint
CREATE INDEX "ledger_visits_occurred_idx" ON "ledger_entries" USING btree ("occurred_at") WHERE "ledger_entries"."counts_as_visit";