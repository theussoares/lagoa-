import { z } from 'zod'
import { IsoDateTimeSchema } from './common'
import { CustomerIdSchema, LoyaltyCardIdSchema, ProgramIdSchema, ShopIdSchema } from './ids'
import { ProgramUnitSchema } from './program'
import { ShopSummarySchema } from './shop'

export const EarnSourceSchema = z.enum([
  'counter',
  'counterAmount',
  'checkIn',
  'welcomeBonus',
  'referralBonus',
  'campaignBonus',
])
export type EarnSource = z.infer<typeof EarnSourceSchema>

/** Uma impressão no cartão de carimbos; `number` é a casa (1..target). */
export const StampSchema = z.object({
  number: z.number().int().positive(),
  earnedAt: IsoDateTimeSchema,
  source: EarnSourceSchema,
})
export type Stamp = z.infer<typeof StampSchema>

export const LoyaltyCardSchema = z.object({
  id: LoyaltyCardIdSchema,
  shopId: ShopIdSchema,
  customerId: CustomerIdSchema,
  programId: ProgramIdSchema,
  unit: ProgramUnitSchema,
  balance: z.number().int().nonnegative(),
  target: z.number().int().positive(),
  rewardTitle: z.string().min(1),
  /** Só no modo carimbos; no modo pontos fica vazio. */
  stamps: z.array(StampSchema),
  lastVisitAt: IsoDateTimeSchema.nullable(),
  /** Prêmio liberado fica guardado até esta data (REWARD_HOLD_DAYS). */
  rewardExpiresAt: IsoDateTimeSchema.nullable(),
})
export type LoyaltyCard = z.infer<typeof LoyaltyCardSchema>

/** Cartão como aparece na carteira do cliente. */
export const WalletCardSchema = LoyaltyCardSchema.omit({ customerId: true }).extend({
  shop: ShopSummarySchema,
})
export type WalletCard = z.infer<typeof WalletCardSchema>
