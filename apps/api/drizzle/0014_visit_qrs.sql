CREATE TYPE "public"."visit_qr_cancel_reason" AS ENUM('merchant', 'programChanged');--> statement-breakpoint
CREATE TYPE "public"."visit_qr_earn_kind" AS ENUM('visit', 'amount');--> statement-breakpoint
CREATE TYPE "public"."visit_qr_status" AS ENUM('active', 'claimed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "visit_qrs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"issued_by" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"visit_code" char(5) NOT NULL,
	"earn_kind" "visit_qr_earn_kind" NOT NULL,
	"amount_cents" integer,
	"status" "visit_qr_status" DEFAULT 'active' NOT NULL,
	"cancel_reason" "visit_qr_cancel_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp with time zone,
	"ledger_entry_id" uuid,
	"refused_at" timestamp with time zone,
	"refusal_available_at" timestamp with time zone,
	CONSTRAINT "visit_qrs_earn_check" CHECK (("visit_qrs"."earn_kind" = 'amount' AND "visit_qrs"."amount_cents" BETWEEN 1 AND 1000000) OR ("visit_qrs"."earn_kind" = 'visit' AND "visit_qrs"."amount_cents" IS NULL)),
	CONSTRAINT "visit_qrs_claim_check" CHECK (("visit_qrs"."status" = 'claimed') = ("visit_qrs"."claimed_at" IS NOT NULL AND "visit_qrs"."ledger_entry_id" IS NOT NULL)),
	CONSTRAINT "visit_qrs_cancel_check" CHECK (("visit_qrs"."status" = 'cancelled') = ("visit_qrs"."cancel_reason" IS NOT NULL)),
	CONSTRAINT "visit_qrs_expiry_check" CHECK ("visit_qrs"."expires_at" > "visit_qrs"."created_at")
);
--> statement-breakpoint
ALTER TABLE "visit_qrs" ADD CONSTRAINT "visit_qrs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_qrs" ADD CONSTRAINT "visit_qrs_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_qrs" ADD CONSTRAINT "visit_qrs_issued_by_app_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_qrs" ADD CONSTRAINT "visit_qrs_claimed_by_customer_profiles_user_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."customer_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_qrs" ADD CONSTRAINT "visit_qrs_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "visit_qrs_token_hash_uq" ON "visit_qrs" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "visit_qrs_active_code_uq" ON "visit_qrs" USING btree ("visit_code") WHERE "visit_qrs"."status" = 'active';--> statement-breakpoint
CREATE INDEX "visit_qrs_code_created_idx" ON "visit_qrs" USING btree ("visit_code","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "visit_qrs_shop_active_idx" ON "visit_qrs" USING btree ("shop_id") WHERE "visit_qrs"."status" = 'active';--> statement-breakpoint
CREATE INDEX "visit_qrs_claimed_by_idx" ON "visit_qrs" USING btree ("claimed_by") WHERE "visit_qrs"."claimed_by" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "visit_qrs_ledger_entry_uq" ON "visit_qrs" USING btree ("ledger_entry_id") WHERE "visit_qrs"."ledger_entry_id" IS NOT NULL;