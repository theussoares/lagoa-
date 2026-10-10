import { sql } from 'drizzle-orm'
import { boolean, char, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { createdAt, primaryId } from './columns'
import { ledgerKind, redemptionStatus, referralStatus } from './enums'
import { programs, shops } from './shops'
import { appUsers, customerProfiles } from './users'

export const loyaltyCards = pgTable(
  'loyalty_cards',
  {
    id: primaryId(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customerProfiles.userId),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id),
    /** Cache do ledger, atualizado na mesma transação da inserção. */
    balance: integer('balance').notNull().default(0),
    /** Vitalício (não zera no resgate nem no vencimento): mantido pelo `LedgerStore.credit`, sob o lock do cartão. */
    visitsCount: integer('visits_count').notNull().default(0),
    firstVisitAt: timestamp('first_visit_at', { withTimezone: true }),
    lastVisitAt: timestamp('last_visit_at', { withTimezone: true }),
    /** Última vez que o cartão ganhou unidades (visita ou bônus): a inatividade conta daqui; o antifraude, só de `lastVisitAt`. */
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    rewardExpiresAt: timestamp('reward_expires_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('loyalty_cards_shop_customer_uq').on(t.shopId, t.customerId),
    index('loyalty_cards_customer_idx').on(t.customerId),
    index('loyalty_cards_shop_last_visit_idx').on(t.shopId, t.lastVisitAt),
  ],
)

export const redemptions = pgTable(
  'redemptions',
  {
    id: primaryId(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => loyaltyCards.id),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    rewardTitle: text('reward_title').notNull(),
    code: char('code', { length: 6 }).notNull(),
    status: redemptionStatus('status').notNull().default('active'),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    redeemedBy: uuid('redeemed_by').references(() => appUsers.id),
  },
  (t) => [
    uniqueIndex('redemptions_active_code_uq')
      .on(t.shopId, t.code)
      .where(sql`${t.status} = 'active'`),
    // Um código ativo por cartão: dois pedidos simultâneos não geram dois códigos.
    uniqueIndex('redemptions_active_card_uq')
      .on(t.cardId)
      .where(sql`${t.status} = 'active'`),
  ],
)

/** Só recebe inserções: a caderneta é a fonte da verdade. */
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: primaryId(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => loyaltyCards.id),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customerProfiles.userId),
    kind: ledgerKind('kind').notNull(),
    unitsDelta: integer('units_delta').notNull(),
    amountCents: integer('amount_cents'),
    countsAsVisit: boolean('counts_as_visit').notNull().default(false),
    recordedBy: uuid('recorded_by').references(() => appUsers.id),
    redemptionId: uuid('redemption_id').references(() => redemptions.id),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // O `id` (UUID v7, ordenado no tempo) desempata linhas do mesmo instante, ex.: visita + boas-vindas.
    index('ledger_card_occurred_idx').on(t.cardId, t.occurredAt.desc(), t.id.desc()),
    index('ledger_shop_occurred_idx').on(t.shopId, t.occurredAt.desc()),
    index('ledger_customer_occurred_idx').on(t.customerId, t.occurredAt.desc(), t.id.desc()),
    // Ranking do mês: só as visitas, por data.
    index('ledger_visits_occurred_idx').on(t.occurredAt).where(sql`${t.countsAsVisit}`),
  ],
)

export const referrals = pgTable(
  'referrals',
  {
    id: primaryId(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    referrerId: uuid('referrer_id')
      .notNull()
      .references(() => customerProfiles.userId),
    referredId: uuid('referred_id')
      .notNull()
      .references(() => customerProfiles.userId),
    status: referralStatus('status').notNull().default('pending'),
    rewardEntryId: uuid('reward_entry_id').references(() => ledgerEntries.id),
    createdAt: createdAt(),
    rewardedAt: timestamp('rewarded_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('referrals_shop_referred_uq').on(t.shopId, t.referredId),
    index('referrals_referrer_idx').on(t.referrerId),
  ],
)
