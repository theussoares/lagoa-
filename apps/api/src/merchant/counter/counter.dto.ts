import { z } from 'zod'
import { PhoneNumberSchema } from '#shared/schemas/phone'

export const RegisterVisitBodySchema = z.object({
  phone: PhoneNumberSchema,
})
export type RegisterVisitBody = z.infer<typeof RegisterVisitBodySchema>

export const RegisterAmountBodySchema = z.object({
  phone: PhoneNumberSchema,
  amountCents: z.number().int().positive(),
})
export type RegisterAmountBody = z.infer<typeof RegisterAmountBodySchema>
