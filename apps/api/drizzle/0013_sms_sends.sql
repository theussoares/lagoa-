CREATE TABLE "sms_sends" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone_hash" "bytea" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sms_sends_phone_sent_idx" ON "sms_sends" USING btree ("phone_hash","sent_at");
--> statement-breakpoint
-- RLS ligado sem policy pública (como as demais): só a credencial de servidor do Nest lê/escreve.
ALTER TABLE "sms_sends" ENABLE ROW LEVEL SECURITY;
