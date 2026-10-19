import { z } from 'zod'
import { FEATURED_NOTE_MAX_LENGTH } from '../constants/domain'
import { IsoDateTimeSchema } from './common'
import { ShopIdSchema } from './ids'

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
