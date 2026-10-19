import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { adminUsers } from './admin'
import { createdAt, primaryId } from './columns'
import { featuredSurface, hitItemStatus } from './enums'
import { shops } from './shops'

export const hitItems = pgTable(
  'hit_items',
  {
    id: primaryId(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    /** 1 a 60 caracteres (`HIT_ITEM_TITLE_MAX_LENGTH`; o drizzle-kit não resolve `#shared`). */
    title: text('title').notNull(),
    description: text('description'),
    /** `null` = sob consulta. */
    priceCents: integer('price_cents'),
    /** Caminho no bucket `shop-assets` (nunca a URL); `null` até a foto chegar, que vem depois de criar o item. */
    photoPath: text('photo_path'),
    /** Botão próprio do produto: mesmas colunas e mesmo CHECK de `shops`; tudo `null` = usa o botão da loja. */
    ctaKind: text('cta_kind'),
    whatsapp: text('whatsapp'),
    whatsappMessage: text('whatsapp_message'),
    ctaUrl: text('cta_url'),
    ctaLabel: text('cta_label'),
    status: hitItemStatus('status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    /** Validade opcional: passou, sai da vitrine sem mudar `status`. */
    endsAt: timestamp('ends_at', { withTimezone: true }),
    /** Sobe a cada edição do lojista: base do conflito entre edição dele e decisão do admin. */
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
  },
  (t) => [
    index('hit_items_shop_idx').on(t.shopId, t.createdAt.desc().nullsLast()),
    index('hit_items_showcase_idx')
      .on(t.approvedAt.desc().nullsLast(), t.id)
      .where(sql`${t.status} = 'approved'`),
    index('hit_items_pending_queue_idx')
      .on(t.createdAt, t.id)
      .where(sql`${t.status} = 'pending'`),
    check('hit_items_price_check', sql`${t.priceCents} IS NULL OR ${t.priceCents} BETWEEN 1 AND 10000000`),
    check('hit_items_title_check', sql`char_length(${t.title}) BETWEEN 1 AND 60`),
    check('hit_items_rejection_reason_check', sql`${t.status} <> 'rejected' OR ${t.rejectionReason} IS NOT NULL`),
    check('hit_items_whatsapp_check', sql`${t.whatsapp} IS NULL OR ${t.whatsapp} ~ '^[1-9]{2}9[0-9]{8}$'`),
    check('hit_items_cta_kind_check', sql`${t.ctaKind} IS NULL OR ${t.ctaKind} IN ('whatsapp', 'url')`),
    // COALESCE: um CHECK que dá NULL passa; sem ele, `cta_label` solto (kind NULL) e `url` sem endereço escapariam.
    check(
      'hit_items_cta_modes_check',
      sql`COALESCE((${t.ctaKind} IS NULL AND ${t.whatsapp} IS NULL AND ${t.ctaUrl} IS NULL AND ${t.whatsappMessage} IS NULL AND ${t.ctaLabel} IS NULL)
        OR (${t.ctaKind} = 'whatsapp' AND ${t.whatsapp} IS NOT NULL AND ${t.ctaUrl} IS NULL
          AND (${t.whatsappMessage} IS NULL OR char_length(${t.whatsappMessage}) BETWEEN 1 AND 300)
          AND (${t.ctaLabel} IS NULL OR char_length(${t.ctaLabel}) BETWEEN 1 AND 24))
        OR (${t.ctaKind} = 'url' AND ${t.ctaUrl} ~ '^https://' AND char_length(${t.ctaUrl}) <= 500
          AND ${t.whatsapp} IS NULL AND ${t.whatsappMessage} IS NULL
          AND char_length(${t.ctaLabel}) BETWEEN 1 AND 24), false)`,
    ),
  ],
)

/** Mesmo padrão de `shop_status_events`: `actorAdminId` nulo quando foi o lojista. */
export const hitItemStatusEvents = pgTable(
  'hit_item_status_events',
  {
    id: primaryId(),
    hitItemId: uuid('hit_item_id')
      .notNull()
      .references(() => hitItems.id),
    fromStatus: hitItemStatus('from_status').notNull(),
    toStatus: hitItemStatus('to_status').notNull(),
    actorAdminId: uuid('actor_admin_id').references(() => adminUsers.id),
    reason: text('reason'),
    createdAt: createdAt(),
  },
  (t) => [index('hit_item_status_events_item_idx').on(t.hitItemId, t.createdAt.desc())],
)

/** Destaque pago. O carrossel do Descobrir aponta para a loja; o banner do Hits, para um produto. */
export const featuredPlacements = pgTable(
  'featured_placements',
  {
    id: primaryId(),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    surface: featuredSurface('surface').notNull(),
    hitItemId: uuid('hit_item_id').references(() => hitItems.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    createdByAdminId: uuid('created_by_admin_id')
      .notNull()
      .references(() => adminUsers.id),
    /** Referência da venda, sem dado pessoal. */
    note: text('note'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('featured_placements_active_idx')
      .on(t.surface, t.startsAt, t.endsAt)
      .where(sql`${t.cancelledAt} IS NULL`),
    check('featured_placements_period_check', sql`${t.endsAt} > ${t.startsAt}`),
    check('featured_placements_item_check', sql`(${t.surface} = 'hitsBanner') = (${t.hitItemId} IS NOT NULL)`),
  ],
)
