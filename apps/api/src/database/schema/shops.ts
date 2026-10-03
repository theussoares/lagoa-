import { boolean, char, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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

export const programs = pgTable('programs', {
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
})
