ALTER TABLE "programs" DROP CONSTRAINT "programs_shop_id_unique";--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "programs_one_active_per_shop_uq" ON "programs" USING btree ("shop_id") WHERE "programs"."active";