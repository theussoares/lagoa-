-- Um dono, uma loja (RN-02): o índice único abaixo falharia no meio se houvesse dono com duas lojas (o seed antigo
-- criava várias por dono). Aborta antes, com mensagem clara, sem deixar a migration pela metade.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "shops" GROUP BY "owner_user_id" HAVING count(*) > 1) THEN
		RAISE EXCEPTION 'merchant foundation: some owner_user_id has more than one shop; give each shop its own owner (pnpm db:seed --reset, then db:seed) before migrating';
	END IF;
END $$;
--> statement-breakpoint
CREATE TYPE "public"."shop_plan" AS ENUM('founder', 'founderPro');--> statement-breakpoint
CREATE TABLE "shop_status_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shop_id" uuid NOT NULL,
	"from_status" "shop_status" NOT NULL,
	"to_status" "shop_status" NOT NULL,
	"plan" "shop_plan" NOT NULL,
	"actor" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "shops_owner_idx";--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "erased_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "plan" "shop_plan" DEFAULT 'founder' NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "merchant_terms_version" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "merchant_terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD COLUMN "visits_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_cards" ADD COLUMN "first_visit_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shop_status_events" ADD CONSTRAINT "shop_status_events_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shop_status_events_shop_idx" ON "shop_status_events" USING btree ("shop_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "shops_owner_uq" ON "shops" USING btree ("owner_user_id");
--> statement-breakpoint
-- Conta apagada: `erase` troca o celular por buffer vazio; o painel precisa saber sem tentar decifrar.
UPDATE "app_users" SET "erased_at" = now() WHERE "erased_at" IS NULL AND octet_length("phone_encrypted") = 0;
--> statement-breakpoint
-- Contadores do cartão a partir do ledger. Idempotente (recalcula, não soma); `pnpm db:backfill-visits` repete depois do
-- deploy do código novo, para cobrir visitas gravadas entre a migration e o deploy.
UPDATE "loyalty_cards" c SET "visits_count" = v.n, "first_visit_at" = v.first_at
FROM (
	SELECT "card_id", count(*)::int AS n, min("occurred_at") AS first_at
	FROM "ledger_entries" WHERE "counts_as_visit" GROUP BY "card_id"
) v WHERE c."id" = v."card_id";
--> statement-breakpoint
-- RLS ligado sem policy pública (como as demais): só a credencial de servidor do Nest lê/escreve.
ALTER TABLE "shop_status_events" ENABLE ROW LEVEL SECURITY;
