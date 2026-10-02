import { z } from 'zod'
import { BirthdaySchema, IsoDateTimeSchema } from '#shared/schemas/common'
import { ChallengeSchema } from '#shared/schemas/discover'
import { ConsentSchema } from '#shared/schemas/customer'
import { CustomerIdSchema, MerchantIdSchema, ShopIdSchema, VisitIdSchema } from '#shared/schemas/ids'
import { LoyaltyCardSchema } from '#shared/schemas/loyaltyCard'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { ProgramSchema, ProgramUnitSchema } from '#shared/schemas/program'
import { RedemptionSchema } from '#shared/schemas/redemption'
import { LoginCodeSchema } from '#shared/schemas/session'
import { CheckInCodeSchema, ShopSchema } from '#shared/schemas/shop'
import { LedgerKindSchema } from '#shared/schemas/visit'

/**
 * Banco do backend falso. Só existe no mock: é o "servidor" que guarda o
 * celular completo. Nada daqui sai para a UI sem passar pelos handlers.
 */
export const MOCK_STATE_VERSION = 3

export const ShopRecordSchema = ShopSchema.extend({ checkInCode: CheckInCodeSchema })
export type ShopRecord = z.infer<typeof ShopRecordSchema>

export const CustomerRecordSchema = z.object({
  id: CustomerIdSchema,
  phone: PhoneNumberSchema,
  firstName: z.string().nullable(),
  birthday: BirthdaySchema.nullable(),
  consent: ConsentSchema,
  termsAcceptedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
})
export type CustomerRecord = z.infer<typeof CustomerRecordSchema>

export const MerchantRecordSchema = z.object({
  id: MerchantIdSchema,
  phone: PhoneNumberSchema,
  shopId: ShopIdSchema,
})
export type MerchantRecord = z.infer<typeof MerchantRecordSchema>

export const LedgerRecordSchema = z.object({
  id: VisitIdSchema,
  shopId: ShopIdSchema,
  customerId: CustomerIdSchema,
  kind: LedgerKindSchema,
  unit: ProgramUnitSchema,
  units: z.number().int().nonnegative(),
  amountCents: z.number().int().positive().nullable(),
  rewardTitle: z.string().nullable(),
  isNewCustomer: z.boolean(),
  createdAt: IsoDateTimeSchema,
})
export type LedgerRecord = z.infer<typeof LedgerRecordSchema>

export const RedemptionRecordSchema = RedemptionSchema.extend({ customerId: CustomerIdSchema })
export type RedemptionRecord = z.infer<typeof RedemptionRecordSchema>

export const LoginChallengeRecordSchema = z.object({
  phone: PhoneNumberSchema,
  code: LoginCodeSchema,
  expiresAt: IsoDateTimeSchema,
})
export type LoginChallengeRecord = z.infer<typeof LoginChallengeRecordSchema>

export const ChallengeRecordSchema = ChallengeSchema.omit({ visitedShopIds: true })
export type ChallengeRecord = z.infer<typeof ChallengeRecordSchema>

export const MockStateSchema = z.object({
  version: z.literal(MOCK_STATE_VERSION),
  shops: z.array(ShopRecordSchema),
  programs: z.array(ProgramSchema),
  customers: z.array(CustomerRecordSchema),
  merchants: z.array(MerchantRecordSchema),
  cards: z.array(LoyaltyCardSchema),
  ledger: z.array(LedgerRecordSchema),
  redemptions: z.array(RedemptionRecordSchema),
  loginChallenges: z.array(LoginChallengeRecordSchema),
  challenges: z.array(ChallengeRecordSchema),
})
export type MockState = z.infer<typeof MockStateSchema>
