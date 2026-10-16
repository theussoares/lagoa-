ALTER TABLE "shops" DROP CONSTRAINT "shops_cta_label_check";--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "cta_kind" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "whatsapp_message" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "cta_url" text;--> statement-breakpoint
UPDATE "shops" SET "cta_kind" = 'whatsapp' WHERE "whatsapp" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_cta_kind_check" CHECK ("shops"."cta_kind" IS NULL OR "shops"."cta_kind" IN ('whatsapp', 'url'));--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_cta_modes_check" CHECK (COALESCE(("shops"."cta_kind" IS NULL AND "shops"."whatsapp" IS NULL AND "shops"."cta_url" IS NULL AND "shops"."whatsapp_message" IS NULL AND "shops"."cta_label" IS NULL)
        OR ("shops"."cta_kind" = 'whatsapp' AND "shops"."whatsapp" IS NOT NULL AND "shops"."cta_url" IS NULL
          AND ("shops"."whatsapp_message" IS NULL OR char_length("shops"."whatsapp_message") BETWEEN 1 AND 300)
          AND ("shops"."cta_label" IS NULL OR char_length("shops"."cta_label") BETWEEN 1 AND 24))
        OR ("shops"."cta_kind" = 'url' AND "shops"."cta_url" ~ '^https://' AND char_length("shops"."cta_url") <= 500
          AND "shops"."whatsapp" IS NULL AND "shops"."whatsapp_message" IS NULL
          AND char_length("shops"."cta_label") BETWEEN 1 AND 24), false));