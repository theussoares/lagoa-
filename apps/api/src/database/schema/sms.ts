import { index, pgTable, timestamp } from 'drizzle-orm/pg-core'
import { bytea, primaryId } from './columns'

/** Cada SMS de login pedido ao provedor, por hash do celular (nunca o número): base do limite por celular. */
export const smsSends = pgTable(
  'sms_sends',
  {
    id: primaryId(),
    phoneHash: bytea('phone_hash').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sms_sends_phone_sent_idx').on(t.phoneHash, t.sentAt)],
)
