import { z } from 'zod'
import { IsoDateTimeSchema } from './common'
import { LoyaltyCardIdSchema, ShopIdSchema, VisitIdSchema } from './ids'
import { MaskedPhoneSchema } from './phone'
import { ProgramUnitSchema } from './program'

export const LedgerKindSchema = z.enum(['visit', 'amount', 'checkIn', 'redemption', 'campaignBonus'])
export type LedgerKind = z.infer<typeof LedgerKindSchema>

/** Linha da caderneta do Balcão. Celular só mascarado. */
export const CounterEntrySchema = z.object({
  id: VisitIdSchema,
  shopId: ShopIdSchema,
  maskedPhone: MaskedPhoneSchema,
  kind: LedgerKindSchema,
  unit: ProgramUnitSchema,
  /** Unidades ganhas (0 no resgate). */
  units: z.number().int().nonnegative(),
  amountCents: z.number().int().positive().nullable(),
  rewardTitle: z.string().nullable(),
  isNewCustomer: z.boolean(),
  createdAt: IsoDateTimeSchema,
})
export type CounterEntry = z.infer<typeof CounterEntrySchema>

/** Situação do cartão logo depois de um lançamento, para o Balcão confirmar. */
export const CardProgressSchema = z.object({
  cardId: LoyaltyCardIdSchema,
  unit: ProgramUnitSchema,
  balance: z.number().int().nonnegative(),
  target: z.number().int().positive(),
  rewardReady: z.boolean(),
})
export type CardProgress = z.infer<typeof CardProgressSchema>

export const VisitRegisteredSchema = z.object({
  entry: CounterEntrySchema,
  card: CardProgressSchema,
  unitsEarned: z.number().int().positive(),
  welcomeUnits: z.number().int().nonnegative(),
})
export type VisitRegistered = z.infer<typeof VisitRegisteredSchema>

/** Linha da caderneta do cliente (sem celular). */
export const WalletActivitySchema = z.object({
  id: VisitIdSchema,
  shopId: ShopIdSchema,
  shopName: z.string(),
  kind: LedgerKindSchema,
  unit: ProgramUnitSchema,
  units: z.number().int().nonnegative(),
  rewardTitle: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
})
export type WalletActivity = z.infer<typeof WalletActivitySchema>

export const CheckInResultSchema = z.object({
  activity: WalletActivitySchema,
  card: CardProgressSchema,
  /** Momento a partir do qual um novo check-in nesta loja é aceito. */
  nextCheckInAt: IsoDateTimeSchema,
})
export type CheckInResult = z.infer<typeof CheckInResultSchema>
