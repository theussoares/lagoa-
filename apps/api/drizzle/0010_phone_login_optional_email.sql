ALTER TABLE "app_users" ALTER COLUMN "email_encrypted" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ALTER COLUMN "email_hash" DROP NOT NULL;