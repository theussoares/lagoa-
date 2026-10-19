CREATE TYPE "public"."featured_surface" AS ENUM('discoverCarousel', 'hitsBanner');--> statement-breakpoint
CREATE TYPE "public"."hit_item_status" AS ENUM('pending', 'approved', 'rejected', 'archived');--> statement-breakpoint
ALTER TYPE "public"."shop_category" ADD VALUE 'clothing' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."shop_category" ADD VALUE 'services' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."shop_category" ADD VALUE 'home' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "admin_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_admin_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"target_admin_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email_encrypted" "bytea" NOT NULL,
	"email_hash" "bytea" NOT NULL,
	"invited_by" uuid,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_hash_unique" UNIQUE("email_hash")
);
--> statement-breakpoint
CREATE TABLE "featured_placements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"surface" "featured_surface" NOT NULL,
	"hit_item_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_by_admin_id" uuid NOT NULL,
	"note" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "featured_placements_period_check" CHECK ("featured_placements"."ends_at" > "featured_placements"."starts_at"),
	CONSTRAINT "featured_placements_item_check" CHECK (("featured_placements"."surface" = 'hitsBanner') = ("featured_placements"."hit_item_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "hit_item_status_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hit_item_id" uuid NOT NULL,
	"from_status" "hit_item_status" NOT NULL,
	"to_status" "hit_item_status" NOT NULL,
	"actor_admin_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hit_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price_cents" integer,
	"photo_path" text NOT NULL,
	"cta_kind" text,
	"whatsapp" text,
	"whatsapp_message" text,
	"cta_url" text,
	"cta_label" text,
	"status" "hit_item_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"ends_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	CONSTRAINT "hit_items_price_check" CHECK ("hit_items"."price_cents" IS NULL OR "hit_items"."price_cents" BETWEEN 1 AND 10000000),
	CONSTRAINT "hit_items_title_check" CHECK (char_length("hit_items"."title") BETWEEN 1 AND 60),
	CONSTRAINT "hit_items_rejection_reason_check" CHECK ("hit_items"."status" <> 'rejected' OR "hit_items"."rejection_reason" IS NOT NULL),
	CONSTRAINT "hit_items_whatsapp_check" CHECK ("hit_items"."whatsapp" IS NULL OR "hit_items"."whatsapp" ~ '^[1-9]{2}9[0-9]{8}$'),
	CONSTRAINT "hit_items_cta_kind_check" CHECK ("hit_items"."cta_kind" IS NULL OR "hit_items"."cta_kind" IN ('whatsapp', 'url')),
	CONSTRAINT "hit_items_cta_modes_check" CHECK (COALESCE(("hit_items"."cta_kind" IS NULL AND "hit_items"."whatsapp" IS NULL AND "hit_items"."cta_url" IS NULL AND "hit_items"."whatsapp_message" IS NULL AND "hit_items"."cta_label" IS NULL)
        OR ("hit_items"."cta_kind" = 'whatsapp' AND "hit_items"."whatsapp" IS NOT NULL AND "hit_items"."cta_url" IS NULL
          AND ("hit_items"."whatsapp_message" IS NULL OR char_length("hit_items"."whatsapp_message") BETWEEN 1 AND 300)
          AND ("hit_items"."cta_label" IS NULL OR char_length("hit_items"."cta_label") BETWEEN 1 AND 24))
        OR ("hit_items"."cta_kind" = 'url' AND "hit_items"."cta_url" ~ '^https://' AND char_length("hit_items"."cta_url") <= 500
          AND "hit_items"."whatsapp" IS NULL AND "hit_items"."whatsapp_message" IS NULL
          AND char_length("hit_items"."cta_label") BETWEEN 1 AND 24), false))
);
--> statement-breakpoint
ALTER TABLE "shop_status_events" ADD COLUMN "actor_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "admin_events" ADD CONSTRAINT "admin_events_actor_admin_id_admin_users_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_events" ADD CONSTRAINT "admin_events_target_admin_id_admin_users_id_fk" FOREIGN KEY ("target_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_invited_by_admin_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_hit_item_id_hit_items_id_fk" FOREIGN KEY ("hit_item_id") REFERENCES "public"."hit_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_created_by_admin_id_admin_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hit_item_status_events" ADD CONSTRAINT "hit_item_status_events_hit_item_id_hit_items_id_fk" FOREIGN KEY ("hit_item_id") REFERENCES "public"."hit_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hit_item_status_events" ADD CONSTRAINT "hit_item_status_events_actor_admin_id_admin_users_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hit_items" ADD CONSTRAINT "hit_items_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_events_target_idx" ON "admin_events" USING btree ("target_admin_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "featured_placements_active_idx" ON "featured_placements" USING btree ("surface","starts_at","ends_at") WHERE "featured_placements"."cancelled_at" IS NULL;--> statement-breakpoint
CREATE INDEX "hit_item_status_events_item_idx" ON "hit_item_status_events" USING btree ("hit_item_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hit_items_shop_idx" ON "hit_items" USING btree ("shop_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hit_items_showcase_idx" ON "hit_items" USING btree ("approved_at" DESC NULLS LAST,"id") WHERE "hit_items"."status" = 'approved';--> statement-breakpoint
CREATE INDEX "hit_items_pending_queue_idx" ON "hit_items" USING btree ("created_at","id") WHERE "hit_items"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "shop_status_events" ADD CONSTRAINT "shop_status_events_actor_admin_id_admin_users_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hit_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hit_item_status_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "featured_placements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_events" ENABLE ROW LEVEL SECURITY;
