import { check, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { bytea, primaryId } from './columns'

/** Cada código de login pedido a um provedor (WhatsApp ou SMS), por hash do celular (nunca o número): base do limite por celular, comum aos canais. */
export const smsSends = pgTable(
  'sms_sends',
  {
    id: primaryId(),
    phoneHash: bytea('phone_hash').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sms_sends_phone_sent_idx').on(t.phoneHash, t.sentAt)],
)

/**
 * Canal que a pessoa escolheu para receber o código (`whatsapp` | `sms`), por hash do celular. O Send SMS Hook do
 * Supabase não repassa o canal; o BFF grava aqui antes de pedir o código e o hook lê. Uma linha por celular.
 */
export const otpChannelChoices = pgTable(
  'otp_channel_choices',
  {
    phoneHash: bytea('phone_hash').primaryKey(),
    channel: text('channel').notNull(),
    chosenAt: timestamp('chosen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('otp_channel_choices_channel_check', sql`${t.channel} in ('whatsapp', 'sms')`)],
)
