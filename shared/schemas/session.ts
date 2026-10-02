import { z } from 'zod'
import { IsoDateTimeSchema } from './common'
import { CustomerIdSchema, MerchantIdSchema, ShopIdSchema } from './ids'
import { LOGIN_CODE_LENGTH } from '../constants/domain'

export const LoginCodeSchema = z
  .string()
  .regex(new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`))
  .brand<'LoginCode'>()
export type LoginCode = z.infer<typeof LoginCodeSchema>

export const LoginChallengeSchema = z.object({ expiresAt: IsoDateTimeSchema })
export type LoginChallenge = z.infer<typeof LoginChallengeSchema>

export const CustomerSessionSchema = z.object({
  role: z.literal('customer'),
  customerId: CustomerIdSchema,
  isNewCustomer: z.boolean(),
})
export type CustomerSession = z.infer<typeof CustomerSessionSchema>

export const MerchantSessionSchema = z.object({
  role: z.literal('merchant'),
  merchantId: MerchantIdSchema,
  shopId: ShopIdSchema,
  shopName: z.string().min(1),
})
export type MerchantSession = z.infer<typeof MerchantSessionSchema>

export const SessionSchema = z.discriminatedUnion('role', [CustomerSessionSchema, MerchantSessionSchema])
export type Session = z.infer<typeof SessionSchema>
