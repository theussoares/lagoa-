import { z } from 'zod'
import { FEATURED_NOTE_MAX_LENGTH, FEATURED_RANGE_MAX_DAYS } from '../constants/domain'
import { IsoDateSchema, IsoDateTimeSchema } from './common'
import { ShopIdSchema } from './ids'

const DAY_MS = 86_400_000

export const FeaturedSurfaceSchema = z.enum(['discoverCarousel', 'hitsBanner'])
export type FeaturedSurface = z.infer<typeof FeaturedSurfaceSchema>

/** Destaque pago. O banner do Hits aponta para um produto; o carrossel do Descobrir aponta para a loja. */
export const FeaturedPlacementDraftSchema = z
  .strictObject({
    shopId: ShopIdSchema,
    surface: FeaturedSurfaceSchema,
    hitItemId: z.string().uuid().nullable(),
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema,
    note: z.string().trim().min(1).max(FEATURED_NOTE_MAX_LENGTH).nullable(),
  })
  .superRefine((placement, ctx) => {
    if (placement.surface === 'hitsBanner' && placement.hitItemId === null) {
      ctx.addIssue({ code: 'custom', path: ['hitItemId'], message: 'hitItemRequired' })
    }
    if (placement.surface === 'discoverCarousel' && placement.hitItemId !== null) {
      ctx.addIssue({ code: 'custom', path: ['hitItemId'], message: 'hitItemNotAllowed' })
    }
    if (Date.parse(placement.endsAt) <= Date.parse(placement.startsAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'endsBeforeStart' })
    }
  })
export type FeaturedPlacementDraft = z.infer<typeof FeaturedPlacementDraftSchema>

/** Janela da agenda e da lista do admin: dias de calendário locais `[from, to)`, no máximo `FEATURED_RANGE_MAX_DAYS`. */
export const FeaturedRangeQuerySchema = z
  .strictObject({ surface: FeaturedSurfaceSchema, from: IsoDateSchema, to: IsoDateSchema })
  .superRefine((range, ctx) => {
    const days = (Date.parse(range.to) - Date.parse(range.from)) / DAY_MS
    if (days < 1) ctx.addIssue({ code: 'custom', path: ['to'], message: 'endsBeforeStart' })
    if (days > FEATURED_RANGE_MAX_DAYS) ctx.addIssue({ code: 'custom', path: ['to'], message: 'rangeTooLong' })
  })
export type FeaturedRangeQuery = z.infer<typeof FeaturedRangeQuerySchema>

const AdminNamedSchema = z.object({ name: z.string() })

/** Destaque como o admin vê: quem lançou e quem cancelou ficam na própria linha (trilha de quem fez o quê). */
export const AdminPlacementSchema = z.object({
  id: z.uuid(),
  surface: FeaturedSurfaceSchema,
  shop: z.object({ id: z.uuid(), name: z.string() }),
  hitItem: z.object({ id: z.uuid(), title: z.string() }).nullable(),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema,
  note: z.string().nullable(),
  createdBy: AdminNamedSchema,
  createdAt: IsoDateTimeSchema,
  cancelledAt: IsoDateTimeSchema.nullable(),
  cancelledBy: AdminNamedSchema.nullable(),
})
export type AdminPlacement = z.infer<typeof AdminPlacementSchema>

/** Destaques que tocam a janela (cancelados inclusive) e as lojas que já estão no carrossel por serem Pro. */
export const AdminFeaturedListSchema = z.object({
  placements: z.array(AdminPlacementSchema),
  proShops: z.array(z.object({ id: z.uuid(), name: z.string() })),
})
export type AdminFeaturedList = z.infer<typeof AdminFeaturedListSchema>

/** Vagas pagas livres em cada dia local da janela: o mínimo livre em qualquer instante do dia. */
export const FeaturedAvailabilitySchema = z.object({
  days: z.array(z.object({ date: IsoDateSchema, freeSlots: z.number().int().min(0) })),
})
export type FeaturedAvailability = z.infer<typeof FeaturedAvailabilitySchema>
