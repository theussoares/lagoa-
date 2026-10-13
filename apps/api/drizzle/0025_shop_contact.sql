ALTER TABLE "shops" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "cta_label" text;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_whatsapp_check" CHECK ("shops"."whatsapp" IS NULL OR "shops"."whatsapp" ~ '^[1-9]{2}9[0-9]{8}$');--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_cta_label_check" CHECK ("shops"."cta_label" IS NULL OR ("shops"."whatsapp" IS NOT NULL AND char_length("shops"."cta_label") BETWEEN 1 AND 24));