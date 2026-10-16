CREATE TABLE "otp_channel_choices" (
	"phone_hash" "bytea" PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"chosen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "otp_channel_choices_channel_check" CHECK ("otp_channel_choices"."channel" in ('whatsapp', 'sms'))
);
--> statement-breakpoint
-- RLS ligado sem policy pública (como as demais): só a credencial de servidor do Nest lê/escreve.
ALTER TABLE "otp_channel_choices" ENABLE ROW LEVEL SECURITY;
