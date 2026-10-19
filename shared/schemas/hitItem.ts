import { z } from 'zod'
import {
  HIT_ITEM_DESCRIPTION_MAX_LENGTH,
  HIT_ITEM_PRICE_MAX_CENTS,
  HIT_ITEM_TITLE_MAX_LENGTH,
} from '../constants/domain'
import { IsoDateTimeSchema } from './common'
import { ShopPublicContactSchema } from './shop'

export const HitItemStatusSchema = z.enum(['pending', 'approved', 'rejected', 'archived'])
export type HitItemStatus = z.infer<typeof HitItemStatusSchema>

/** O que o lojista envia. `contact: null` usa o botão da loja; `priceCents: null` é "sob consulta". */
export const HitItemDraftSchema = z.strictObject({
  title: z.string().trim().min(1).max(HIT_ITEM_TITLE_MAX_LENGTH),
  description: z.string().trim().min(1).max(HIT_ITEM_DESCRIPTION_MAX_LENGTH).nullable(),
  priceCents: z.number().int().positive().max(HIT_ITEM_PRICE_MAX_CENTS).nullable(),
  contact: ShopPublicContactSchema.nullable(),
  endsAt: IsoDateTimeSchema.nullable(),
})
export type HitItemDraft = z.infer<typeof HitItemDraftSchema>

/** O produto como o painel do lojista lê. */
export const MerchantHitItemSchema = HitItemDraftSchema.extend({
  id: z.string().uuid(),
  status: HitItemStatusSchema,
  rejectionReason: z.string().nullable(),
  photoUrl: z.string().url().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})
export type MerchantHitItem = z.infer<typeof MerchantHitItemSchema>
