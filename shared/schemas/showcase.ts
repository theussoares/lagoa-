import { z } from 'zod'
import { HIT_ITEM_DESCRIPTION_MAX_LENGTH, HIT_ITEM_TITLE_MAX_LENGTH } from '../constants/domain'
import { ShowcaseEarningSchema } from '../domain/showcaseEarning'
import { ShopGroupSchema } from '../domain/shopGroup'
import { ShopIdSchema } from './ids'
import { ShopCategorySchema, ShopPublicContactSchema, ShopSummarySchema } from './shop'

/** Produto do Hits como o cliente vê: aprovado, com a loja e o que rende hoje. */
export const PublicHitItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(HIT_ITEM_TITLE_MAX_LENGTH),
  description: z.string().min(1).max(HIT_ITEM_DESCRIPTION_MAX_LENGTH).nullable(),
  priceCents: z.number().int().positive().nullable(),
  photoUrl: z.string().url(),
  earning: ShowcaseEarningSchema,
  contact: ShopPublicContactSchema.nullable(),
  shop: z.object({
    id: ShopIdSchema,
    name: z.string().min(1),
    category: ShopCategorySchema,
    neighborhood: z.string().min(1),
  }),
})
export type PublicHitItem = z.infer<typeof PublicHitItemSchema>

export const PublicHitItemPageSchema = z.object({
  items: z.array(PublicHitItemSchema),
  nextCursor: z.string().nullable(),
})
export type PublicHitItemPage = z.infer<typeof PublicHitItemPageSchema>

/** Banner do topo do Hits; `sponsored` = destaque pago (o app marca "Patrocinado"). */
export const HitsBannerSchema = z.object({ item: PublicHitItemSchema, sponsored: z.boolean() })
export type HitsBanner = z.infer<typeof HitsBannerSchema>

export const HitsQuerySchema = z.strictObject({
  group: ShopGroupSchema.optional(),
  cursor: z.uuid().optional(),
})
export type HitsQuery = z.infer<typeof HitsQuerySchema>

/** Loja do carrossel do Descobrir; `sponsored` = destaque pago. */
export const FeaturedShopSchema = ShopSummarySchema.extend({ sponsored: z.boolean() })
export type FeaturedShop = z.infer<typeof FeaturedShopSchema>
