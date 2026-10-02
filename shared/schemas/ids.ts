import { z } from 'zod'

const id = z.string().min(1)

export const ShopIdSchema = id.brand<'ShopId'>()
export const CustomerIdSchema = id.brand<'CustomerId'>()
export const MerchantIdSchema = id.brand<'MerchantId'>()
export const ProgramIdSchema = id.brand<'ProgramId'>()
export const LoyaltyCardIdSchema = id.brand<'LoyaltyCardId'>()
export const VisitIdSchema = id.brand<'VisitId'>()
export const RedemptionIdSchema = id.brand<'RedemptionId'>()
export const ChallengeIdSchema = id.brand<'ChallengeId'>()

export type ShopId = z.infer<typeof ShopIdSchema>
export type CustomerId = z.infer<typeof CustomerIdSchema>
export type MerchantId = z.infer<typeof MerchantIdSchema>
export type ProgramId = z.infer<typeof ProgramIdSchema>
export type LoyaltyCardId = z.infer<typeof LoyaltyCardIdSchema>
export type VisitId = z.infer<typeof VisitIdSchema>
export type RedemptionId = z.infer<typeof RedemptionIdSchema>
export type ChallengeId = z.infer<typeof ChallengeIdSchema>
