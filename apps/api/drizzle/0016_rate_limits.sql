-- UNLOGGED: contador de janela curta e descartável (sem WAL, escrita mais barata). Depois de uma queda do Postgres a
-- tabela volta vazia e os limites recomeçam; isso é aceitável (ADR-0002).
CREATE UNLOGGED TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "rate_limits_expires_idx" ON "rate_limits" USING btree ("expires_at");
--> statement-breakpoint
-- RLS ligado sem policy pública (como as demais): só a credencial de servidor do Nest lê/escreve.
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
