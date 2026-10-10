import { sql } from 'drizzle-orm'
import { boolean, char, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import type { BonusRules } from '#shared/schemas/program'
import { createdAt, primaryId } from './columns'
import { earnPer, expirationKind, programMode, programUnit, shopCategory, shopPlan, shopStatus } from './enums'
import { appUsers } from './users'

export const shops = pgTable(
  'shops',
  {
    id: primaryId(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => appUsers.id),
    name: text('name').notNull(),
    category: shopCategory('category').notNull(),
    neighborhood: text('neighborhood').notNull(),
    addressLine: text('address_line').notNull(),
    checkInCode: char('check_in_code', { length: 6 }).notNull().unique(),
    logoPath: text('logo_path'),
    status: shopStatus('status').notNull().default('pending'),
    plan: shopPlan('plan').notNull().default('founder'),
    /** Versão do termo do lojista aceita (`MERCHANT_TERMS_VERSION`) e quando: prova do que foi lido. */
    /** Cartaz novo impresso? `null` = ainda não (aviso no Início); o Criar o clube já grava `now()`. */
    posterReprintedAt: timestamp('poster_reprinted_at', { withTimezone: true }),
    merchantTermsVersion: text('merchant_terms_version'),
    merchantTermsAcceptedAt: timestamp('merchant_terms_accepted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  // Um dono, uma loja (RN-02); trocar por `shop_members` mexe aqui e no resolver, não nos services.
  (t) => [index('shops_status_idx').on(t.status), uniqueIndex('shops_owner_uq').on(t.ownerUserId)],
)

/** Quem mudou a situação ou o plano de uma loja, por script da rede. `actor` é um apelido de operador, nunca e-mail. */
export const shopStatusEvents = pgTable(
  'shop_status_events',
  {
    id: primaryId(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    fromStatus: shopStatus('from_status').notNull(),
    toStatus: shopStatus('to_status').notNull(),
    plan: shopPlan('plan').notNull(),
    actor: text('actor').notNull(),
    reason: text('reason'),
    createdAt: createdAt(),
  },
  (t) => [index('shop_status_events_shop_idx').on(t.shopId, t.createdAt.desc())],
)

export const programs = pgTable(
  'programs',
  {
  id: primaryId(),
  shopId: uuid('shop_id')
    .notNull()
    .references(() => shops.id),
  /**
   * Versão do programa: trocar as regras cria uma linha nova ativa e desativa a anterior. Cartões em
   * andamento seguem na versão em que nasceram até fecharem; só o cartão novo (ou zerado) pega a ativa.
   */
  active: boolean('active').notNull().default(true),
  rewardTitle: text('reward_title').notNull(),
  mode: programMode('mode').notNull(),
  unit: programUnit('unit').notNull(),
  earnPer: earnPer('earn_per').notNull(),
  earnUnits: integer('earn_units').notNull(),
  target: integer('target').notNull(),
  bonusRules: jsonb('bonus_rules').$type<BonusRules>().notNull(),
  expirationKind: expirationKind('expiration_kind').notNull().default('never'),
  expirationMonths: integer('expiration_months'),
  checkInEnabled: boolean('check_in_enabled').notNull().default(true),
  checkInCooldownHours: integer('check_in_cooldown_hours').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('programs_one_active_per_shop_uq').on(t.shopId).where(sql`${t.active}`),
    // Mesma regra do `ExpirationPolicySchema` (24 = EXPIRATION_MAX_MONTHS; o drizzle-kit não resolve `#shared`).
    // `IS NOT NULL` é necessário: CHECK que resulta em NULL passa no Postgres.
    // Janela de check-in de 1 a 168 h (CHECK_IN_COOLDOWN_MAX_HOURS): 0 ou negativo liberaria check-in ilimitado.
    check('programs_check_in_cooldown_check', sql`${t.checkInCooldownHours} BETWEEN 1 AND 168`),
    check('programs_expiration_check', sql`${t.expirationKind} = 'never' OR (${t.expirationMonths} IS NOT NULL AND ${t.expirationMonths} BETWEEN 1 AND 24)`),
  ],
)
