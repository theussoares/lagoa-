import { LOGIN_CODE_TTL_MINUTES, SIGN_UP_TICKET_TTL_MINUTES } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { SignUpTicketSchema } from '#shared/schemas/session'
import type { CustomerSession, LoginChallenge, LoginCode, MerchantSignInResult } from '#shared/schemas/session'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { addMinutes, toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import { ensureCustomer, findShop } from './queries'

type CodeError = ErrorOf<'invalidLoginCode' | 'loginCodeExpired'>

/** No mock o "SMS" não sai: o código é sempre o de teste configurado no backend. */
export function requestLoginCode(ctx: MockContext, phone: PhoneNumber, code: LoginCode): LoginChallenge {
  const expiresAt = toIso(addMinutes(ctx.now, LOGIN_CODE_TTL_MINUTES))
  ctx.state.loginChallenges = [
    ...ctx.state.loginChallenges.filter((challenge) => challenge.phone !== phone),
    { phone, code, expiresAt },
  ]
  return { expiresAt }
}

function consumeLoginCode(ctx: MockContext, phone: PhoneNumber, code: LoginCode): Result<true, CodeError> {
  const challenge = ctx.state.loginChallenges.find((item) => item.phone === phone)
  if (challenge === undefined || challenge.code !== code) return err({ code: 'invalidLoginCode' })
  ctx.state.loginChallenges = ctx.state.loginChallenges.filter((item) => item.phone !== phone)
  if (new Date(challenge.expiresAt) <= ctx.now) return err({ code: 'loginCodeExpired' })
  return ok(true)
}

export function signInCustomer(
  ctx: MockContext,
  phone: PhoneNumber,
  code: LoginCode,
): Result<CustomerSession, CodeError> {
  const verified = consumeLoginCode(ctx, phone, code)
  if (!verified.ok) return verified
  const { customer, isNew } = ensureCustomer(ctx, phone)
  return ok({ role: 'customer', customerId: customer.id, isNewCustomer: isNew })
}

/** Celular confirmado sem loja vira um ticket para o Criar o clube; o celular fica guardado aqui, não na tela. */
function issueSignUpTicket(ctx: MockContext, phone: PhoneNumber): MerchantSignInResult {
  const ticket = SignUpTicketSchema.parse(ctx.ids.next('signup'))
  const expiresAt = toIso(addMinutes(ctx.now, SIGN_UP_TICKET_TTL_MINUTES))
  ctx.state.signUpTickets = [...ctx.state.signUpTickets.filter((item) => item.phone !== phone), { ticket, phone, expiresAt }]
  return { kind: 'signUp' }
}

export function signInMerchant(
  ctx: MockContext,
  phone: PhoneNumber,
  code: LoginCode,
): Result<MerchantSignInResult, CodeError | ErrorOf<'shopSuspended' | 'unauthorized'>> {
  const verified = consumeLoginCode(ctx, phone, code)
  if (!verified.ok) return verified
  const merchant = ctx.state.merchants.find((item) => item.phone === phone)
  if (merchant === undefined) return ok(issueSignUpTicket(ctx, phone))
  // Lojista sem loja é dado quebrado, não cadastro novo: o Criar o clube recusaria o celular.
  const shop = findShop(ctx, merchant.shopId)
  if (shop === undefined) return err({ code: 'unauthorized' })
  if (shop.status === 'suspended') return err({ code: 'shopSuspended' })
  return ok({
    kind: 'session',
    session: { role: 'merchant', merchantId: merchant.id, shopId: shop.id, shopName: shop.name, shopStatus: shop.status },
  })
}
