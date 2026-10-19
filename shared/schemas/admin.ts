import { z } from 'zod'
import {
  ADMIN_NAME_MAX_LENGTH,
  ADMIN_NAME_MIN_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  HIT_ITEM_REJECTION_REASON_MAX_LENGTH,
} from '../constants/domain'
import { IsoDateTimeSchema } from './common'
import { ShopPlanSchema } from './shop'

const ReasonSchema = z.string().trim().min(1).max(ADMIN_REASON_MAX_LENGTH)

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.email().max(EMAIL_MAX_LENGTH),
  disabledAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
})
export type AdminUser = z.infer<typeof AdminUserSchema>

export const AdminInviteSchema = z.strictObject({
  name: z.string().trim().min(ADMIN_NAME_MIN_LENGTH).max(ADMIN_NAME_MAX_LENGTH),
  email: z.email().max(EMAIL_MAX_LENGTH),
})
export type AdminInvite = z.infer<typeof AdminInviteSchema>

/** Ação do admin sobre uma loja. Suspender exige o motivo. */
export const AdminShopActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('approve') }),
  z.strictObject({ action: z.literal('suspend'), reason: ReasonSchema }),
  z.strictObject({ action: z.literal('reactivate') }),
  z.strictObject({ action: z.literal('changePlan'), plan: ShopPlanSchema }),
])
export type AdminShopAction = z.infer<typeof AdminShopActionSchema>

/** Moderação de um produto do Hits. `expectedVersion` barra aprovar o que o lojista editou depois de o admin abrir. */
export const HitItemReviewSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('approve'), expectedVersion: z.number().int().min(1) }),
  z.strictObject({
    action: z.literal('reject'),
    reason: z.string().trim().min(1).max(HIT_ITEM_REJECTION_REASON_MAX_LENGTH),
  }),
  z.strictObject({
    action: z.literal('takeDown'),
    reason: z.string().trim().min(1).max(HIT_ITEM_REJECTION_REASON_MAX_LENGTH),
  }),
])
export type HitItemReview = z.infer<typeof HitItemReviewSchema>
