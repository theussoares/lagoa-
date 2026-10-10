import { HttpException } from '@nestjs/common'
import type { DomainError, DomainErrorCode } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  unauthorized: 401,
  network: 503,
  rateLimited: 429,
  internal: 500,
  notFound: 404,
  invalidPhone: 400,
  phoneAlreadyUsed: 409,
  accountOwnsShop: 409,
  emailAlreadyUsed: 409,
  invalidLoginCode: 400,
  loginCodeExpired: 400,
  invalidAmount: 400,
  invalidShopPhoto: 400,
  amountNotAccepted: 422,
  invalidShopQr: 404,
  checkInDisabled: 403,
  checkInCooldown: 429,
  invalidVisitQr: 404,
  visitQrLimitReached: 409,
  visitQrExpired: 410,
  visitQrAlreadyUsed: 409,
  visitQrStale: 409,
  shopQrJoinOnly: 422,
  rewardNotReady: 409,
  redemptionInvalid: 404,
  redemptionExpired: 410,
  redemptionAlreadyUsed: 409,
  invalidProgram: 400,
  invalidCampaign: 400,
  noReachableCustomers: 409,
  reachChanged: 409,
  invalidClubSetup: 400,
  signUpExpired: 410,
  shopPendingApproval: 403,
  shopSuspended: 403,
  birthdayLocked: 409,
  termsNotAccepted: 403,
  merchantTermsNotAccepted: 403,
}

/** O corpo da resposta é o próprio `DomainError`, que a UI traduz por `code`. Nunca carrega dado pessoal. */
export class DomainException extends HttpException {
  constructor(error: DomainError) {
    super(error, STATUS_BY_CODE[error.code])
  }
}

/** Ponte entre o `Result` dos services e o HTTP: o controller só devolve o valor. */
export function unwrap<T, E extends DomainError>(result: Result<T, E>): T {
  if (!result.ok) throw new DomainException(result.error)
  return result.value
}
