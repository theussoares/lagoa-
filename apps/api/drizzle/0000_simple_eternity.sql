CREATE TYPE "public"."earn_per" AS ENUM('visit', 'real');--> statement-breakpoint
CREATE TYPE "public"."expiration_kind" AS ENUM('never', 'afterInactivity');--> statement-breakpoint
CREATE TYPE "public"."ledger_kind" AS ENUM('visit', 'amount', 'checkIn', 'welcomeBonus', 'referralBonus', 'redemption', 'expiration');--> statement-breakpoint
CREATE TYPE "public"."program_mode" AS ENUM('stamps', 'pointsPerCurrency', 'pointsPerVisit');--> statement-breakpoint
CREATE TYPE "public"."program_unit" AS ENUM('stamp', 'point');--> statement-breakpoint
CREATE TYPE "public"."redemption_status" AS ENUM('active', 'redeemed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'rewarded', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."shop_category" AS ENUM('barbershop', 'beauty', 'cafe', 'bakery', 'pizzeria', 'restaurant', 'petShop', 'gym', 'other');--> statement-breakpoint
CREATE TYPE "public"."shop_status" AS ENUM('pending', 'approved', 'suspended');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email_encrypted" "bytea" NOT NULL,
	"email_hash" "bytea" NOT NULL,
	"phone_encrypted" "bytea" NOT NULL,
	"phone_hash" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_hash_unique" UNIQUE("email_hash"),
	CONSTRAINT "app_users_phone_hash_unique" UNIQUE("phone_hash")
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text,
	"birthday" char(5),
	"birthday_changed_at" timestamp with time zone,
	"referral_code" char(8) NOT NULL,
	"terms_accepted_at" timestamp with time zone,
	"notifications_consent" boolean DEFAULT false NOT NULL,
	"consent_updated_at" timestamp with time zone,
	CONSTRAINT "customer_profiles_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"reward_title" text NOT NULL,
	"mode" "program_mode" NOT NULL,
	"unit" "program_unit" NOT NULL,
	"earn_per" "earn_per" NOT NULL,
	"earn_units" integer NOT NULL,
	"target" integer NOT NULL,
	"bonus_rules" jsonb NOT NULL,
	"expiration_kind" "expiration_kind" DEFAULT 'never' NOT NULL,
	"expiration_months" integer,
	"check_in_enabled" boolean DEFAULT true NOT NULL,
	"check_in_cooldown_hours" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programs_shop_id_unique" UNIQUE("shop_id")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "shop_category" NOT NULL,
	"neighborhood" text NOT NULL,
	"address_line" text NOT NULL,
	"check_in_code" char(6) NOT NULL,
	"logo_path" text,
	"status" "shop_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_check_in_code_unique" UNIQUE("check_in_code")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"card_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"kind" "ledger_kind" NOT NULL,
	"units_delta" integer NOT NULL,
	"amount_cents" integer,
	"counts_as_visit" boolean DEFAULT false NOT NULL,
	"recorded_by" uuid,
	"redemption_id" uuid,
	"idempotency_key" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "loyalty_cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"last_visit_at" timestamp with time zone,
	"reward_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"card_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"reward_title" text NOT NULL,
	"code" char(6) NOT NULL,
	"status" "redemption_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"redeemed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referred_id" uuid NOT NULL,
	"status" "referral_status" DEFAULT 'pending' NOT NULL,
	"reward_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rewarded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_user_id_app_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_card_id_loyalty_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."loyalty_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_customer_id_customer_profiles_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_recorded_by_app_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_redemption_id_redemptions_id_fk" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_customer_id_customer_profiles_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_card_id_loyalty_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."loyalty_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_redeemed_by_app_users_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_customer_profiles_user_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."customer_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_customer_profiles_user_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."customer_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_reward_entry_id_ledger_entries_id_fk" FOREIGN KEY ("reward_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shops_status_idx" ON "shops" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shops_owner_idx" ON "shops" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "ledger_card_occurred_idx" ON "ledger_entries" USING btree ("card_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ledger_shop_occurred_idx" ON "ledger_entries" USING btree ("shop_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_cards_shop_customer_uq" ON "loyalty_cards" USING btree ("shop_id","customer_id");--> statement-breakpoint
CREATE INDEX "loyalty_cards_customer_idx" ON "loyalty_cards" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "loyalty_cards_shop_last_visit_idx" ON "loyalty_cards" USING btree ("shop_id","last_visit_at");--> statement-breakpoint
CREATE UNIQUE INDEX "redemptions_active_code_uq" ON "redemptions" USING btree ("shop_id","code") WHERE "redemptions"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_shop_referred_uq" ON "referrals" USING btree ("shop_id","referred_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");