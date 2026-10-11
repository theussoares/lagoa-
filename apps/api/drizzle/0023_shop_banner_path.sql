ALTER TABLE "shops" ADD COLUMN "banner_path" text;--> statement-breakpoint
-- Até aqui a única imagem (logo_path) era a "foto da loja" mostrada como capa do card no Descobrir: ela vira o banner.
UPDATE "shops" SET "banner_path" = "logo_path", "logo_path" = NULL WHERE "logo_path" IS NOT NULL;
