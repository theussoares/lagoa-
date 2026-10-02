import { z } from 'zod'
import { BirthdaySchema, IsoDateTimeSchema } from './common'
import { CustomerIdSchema } from './ids'
import { MaskedPhoneSchema } from './phone'
import { ProgramUnitSchema } from './program'

export const ConsentSchema = z.object({
  /** Avisos e campanhas das lojas. Explícito e revogável. */
  notifications: z.boolean(),
  updatedAt: IsoDateTimeSchema.nullable(),
})
export type Consent = z.infer<typeof ConsentSchema>

export const CustomerProfileSchema = z.object({
  id: CustomerIdSchema,
  firstName: z.string().min(1).max(40).nullable(),
  birthday: BirthdaySchema.nullable(),
  maskedPhone: MaskedPhoneSchema,
  consent: ConsentSchema,
  termsAcceptedAt: IsoDateTimeSchema.nullable(),
})
export type CustomerProfile = z.infer<typeof CustomerProfileSchema>

export const ProfileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(40).nullable(),
  birthday: BirthdaySchema.nullable(),
})
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>

/** Linha da tela Clientes do lojista. */
export const MerchantCustomerRowSchema = z.object({
  customerId: CustomerIdSchema,
  maskedPhone: MaskedPhoneSchema,
  firstName: z.string().nullable(),
  unit: ProgramUnitSchema,
  balance: z.number().int().nonnegative(),
  target: z.number().int().positive(),
  visitsCount: z.number().int().nonnegative(),
  lastVisitAt: IsoDateTimeSchema.nullable(),
  isLapsed: z.boolean(),
  acceptsNotifications: z.boolean(),
})
export type MerchantCustomerRow = z.infer<typeof MerchantCustomerRowSchema>

export const CustomerFilterSchema = z.enum(['all', 'lapsed', 'rewardReady'])
export type CustomerFilter = z.infer<typeof CustomerFilterSchema>
