import { z } from 'zod'
import { IsoDateTimeSchema, readableCodeSchema } from './common'
import { LoyaltyCardIdSchema, RedemptionIdSchema, ShopIdSchema } from './ids'
import { MaskedPhoneSchema } from './phone'
import { REDEMPTION_CODE_LENGTH } from '../constants/domain'

export const RedemptionCodeSchema = readableCodeSchema(REDEMPTION_CODE_LENGTH).brand<'RedemptionCode'>()
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

export const RedemptionIdParamSchema = z.uuid().pipe(RedemptionIdSchema)

/** O cliente pede o código de um cartão seu; quem manda o id é o app, quem decide é o servidor. */
export const RedemptionRequestSchema = z.object({ cardId: z.uuid().pipe(LoyaltyCardIdSchema) })
export type RedemptionRequest = z.infer<typeof RedemptionRequestSchema>

/** O que o Balcão vê depois de validar o código, antes de entregar o prêmio. */
export const RedemptionPreviewSchema = z.object({
  redemptionId: RedemptionIdSchema,
  rewardTitle: z.string().min(1),
  maskedPhone: MaskedPhoneSchema,
  expiresAt: IsoDateTimeSchema,
})
export type RedemptionPreview = z.infer<typeof RedemptionPreviewSchema>
