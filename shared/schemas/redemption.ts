import { z } from 'zod'
import { IsoDateTimeSchema } from './common'
import { LoyaltyCardIdSchema, RedemptionIdSchema, ShopIdSchema } from './ids'
import { MaskedPhoneSchema } from './phone'
import { REDEMPTION_CODE_LENGTH } from '../constants/domain'

export const RedemptionCodeSchema = z
  .string()
  .regex(new RegExp(`^[A-HJ-NP-Z2-9]{${REDEMPTION_CODE_LENGTH}}$`))
  .brand<'RedemptionCode'>()
export type RedemptionCode = z.infer<typeof RedemptionCodeSchema>

export const RedemptionStatusSchema = z.enum(['active', 'redeemed', 'expired'])
export type RedemptionStatus = z.infer<typeof RedemptionStatusSchema>

/** Código que o cliente mostra no balcão. */
export const RedemptionSchema = z.object({
  id: RedemptionIdSchema,
  code: RedemptionCodeSchema,
  cardId: LoyaltyCardIdSchema,
  shopId: ShopIdSchema,
  rewardTitle: z.string().min(1),
  createdAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  status: RedemptionStatusSchema,
})
export type Redemption = z.infer<typeof RedemptionSchema>

/** O que o Balcão vê depois de validar o código, antes de entregar o prêmio. */
export const RedemptionPreviewSchema = z.object({
  redemptionId: RedemptionIdSchema,
  rewardTitle: z.string().min(1),
  maskedPhone: MaskedPhoneSchema,
  expiresAt: IsoDateTimeSchema,
})
export type RedemptionPreview = z.infer<typeof RedemptionPreviewSchema>
