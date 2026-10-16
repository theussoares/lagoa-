CREATE TABLE "otp_channel_choices" (
	"phone_hash" "bytea" PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"chosen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- RLS ligado sem policy pública (como as demais): só a credencial de servidor do Nest lê/escreve.
ALTER TABLE "otp_channel_choices" ENABLE ROW LEVEL SECURITY;
