import { z } from 'zod'
import { IsoDateTimeSchema } from './common'
import { CustomerIdSchema, MerchantIdSchema, ShopIdSchema } from './ids'
import { LOGIN_CODE_LENGTH } from '../constants/domain'
import { ShopStatusSchema } from './shop'

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
  /** Lida no login. Loja nova fica `pending` até a rede aprovar; o servidor é quem barra o Balcão. */
  shopStatus: ShopStatusSchema,
  /** A loja aceitou a versão atual do termo do lojista (`MERCHANT_TERMS_VERSION`). Falso = o Início pede o aceite. */
  // Tolerante enquanto a API publicada não manda o campo: sem ele, o Início pede o aceite.
  termsAccepted: z.boolean().default(false),
})
export type MerchantSession = z.infer<typeof MerchantSessionSchema>

export const SessionSchema = z.discriminatedUnion('role', [CustomerSessionSchema, MerchantSessionSchema])
export type Session = z.infer<typeof SessionSchema>

/** Celular confirmado, mas sem loja: vale só para criar o clube, por pouco tempo. O celular fica no servidor. Só o mock usa. */
export const SignUpTicketSchema = z.string().min(1).brand<'SignUpTicket'>()
export type SignUpTicket = z.infer<typeof SignUpTicketSchema>

export const MerchantSignInResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('session'), session: MerchantSessionSchema }),
  /** Celular confirmado, sem loja: quem sabe quem é o dono é o cookie da sessão, não um ticket. */
  z.object({ kind: z.literal('signUp') }),
])
export type MerchantSignInResult = z.infer<typeof MerchantSignInResultSchema>
