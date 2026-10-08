import { z } from 'zod'
import { CUSTOMER_FIRST_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, PHONE_INPUT_MAX_LENGTH } from '../constants/domain'
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
  firstName: z.string().min(1).max(CUSTOMER_FIRST_NAME_MAX_LENGTH).nullable(),
  birthday: BirthdaySchema.nullable(),
  /** Quando a data pode ser trocada de novo; `null` = já pode. */
  birthdayChangeableAt: IsoDateTimeSchema.nullable(),
  maskedPhone: MaskedPhoneSchema,
  consent: ConsentSchema,
  termsAcceptedAt: IsoDateTimeSchema.nullable(),
})
export type CustomerProfile = z.infer<typeof CustomerProfileSchema>

export const ProfileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(CUSTOMER_FIRST_NAME_MAX_LENGTH).nullable(),
  birthday: BirthdaySchema.nullable(),
})
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>

export const ConsentUpdateSchema = z.object({ granted: z.boolean() })
export type ConsentUpdate = z.infer<typeof ConsentUpdateSchema>

/**
 * Cadastro do cliente. O celular de quem entrou por SMS já vem confirmado no token; `phone` só vale no login por e-mail.
 * `firstName` é o nome pelo qual a pessoa quer ser chamada (app e painel); `email` é opcional e só identifica a conta.
 */
export const CustomerRegistrationSchema = z.object({
  phone: z.string().max(PHONE_INPUT_MAX_LENGTH).optional(),
  firstName: z.string().trim().min(1).max(CUSTOMER_FIRST_NAME_MAX_LENGTH).optional(),
  email: z.email().max(EMAIL_MAX_LENGTH).optional(),
})
export type CustomerRegistration = z.infer<typeof CustomerRegistrationSchema>

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
