DROP INDEX "ledger_card_occurred_idx";--> statement-breakpoint
DROP INDEX "ledger_customer_occurred_idx";--> statement-breakpoint
CREATE INDEX "ledger_card_occurred_idx" ON "ledger_entries" USING btree ("card_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ledger_customer_occurred_idx" ON "ledger_entries" USING btree ("customer_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);