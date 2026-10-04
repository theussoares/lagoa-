import { sql } from 'drizzle-orm'
import { boolean, char, check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { BonusRules } from '#shared/schemas/program'
import { createdAt, primaryId } from './columns'
import { earnPer, expirationKind, programMode, programUnit, shopCategory, shopStatus } from './enums'
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
    createdAt: createdAt(),
  },
  (t) => [index('shops_status_idx').on(t.status), index('shops_owner_idx').on(t.ownerUserId)],
)

export const programs = pgTable(
  'programs',
  {
  id: primaryId(),
  shopId: uuid('shop_id')
    .notNull()
    .unique()
    .references(() => shops.id),
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
    // Mesma regra do `ExpirationPolicySchema` (24 = EXPIRATION_MAX_MONTHS; o drizzle-kit não resolve `#shared`).
    // `IS NOT NULL` é necessário: CHECK que resulta em NULL passa no Postgres.
    // Janela de check-in de 1 a 168 h (CHECK_IN_COOLDOWN_MAX_HOURS): 0 ou negativo liberaria check-in ilimitado.
    check('programs_check_in_cooldown_check', sql`${t.checkInCooldownHours} BETWEEN 1 AND 168`),
    check('programs_expiration_check', sql`${t.expirationKind} = 'never' OR (${t.expirationMonths} IS NOT NULL AND ${t.expirationMonths} BETWEEN 1 AND 24)`),
  ],
)
