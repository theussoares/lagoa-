import type { DomainError, DomainErrorCode, ErrorOf, TransportError } from '#shared/types/errors'
import { IsoDateTimeSchema } from '#shared/schemas/common'

const ENTITIES = ['shop', 'program', 'customer', 'merchant', 'card', 'redemption', 'visitQr'] as const
const SIMPLE_CODES = [
  'unauthorized', 'rateLimited', 'invalidPhone', 'phoneAlreadyUsed', 'accountOwnsShop', 'emailAlreadyUsed', 'invalidLoginCode', 'loginCodeExpired',
  'invalidAmount', 'amountNotAccepted', 'invalidShopQr', 'checkInDisabled', 'redemptionInvalid', 'redemptionExpired',
  'redemptionAlreadyUsed', 'invalidProgram', 'programModeLocked', 'invalidCampaign', 'noReachableCustomers', 'reachChanged',
  'invalidClubSetup', 'signUpExpired', 'shopPendingApproval', 'shopSuspended', 'termsNotAccepted',
] as const

/** Em lista própria: uma união de literais com mais de 25 membros o TypeScript não consegue correlacionar com `DomainError`. */
const VISIT_QR_CODES = ['invalidVisitQr', 'visitQrExpired', 'visitQrAlreadyUsed', 'visitQrStale', 'shopQrJoinOnly'] as const

type VisitQrCode = (typeof VISIT_QR_CODES)[number]
type SimpleCode = (typeof SIMPLE_CODES)[number]

const isSimple = (code: string): code is SimpleCode => SIMPLE_CODES.some((simple) => simple === code)
const isVisitQrCode = (code: string): code is VisitQrCode => VISIT_QR_CODES.some((visitQr) => visitQr === code)
const isEntity = (value: unknown): value is (typeof ENTITIES)[number] => ENTITIES.some((entity) => entity === value)

function field(body: Record<string, unknown>, key: string): unknown {
  return body[key]
}

/** Corpo de erro da API (`{ code, ... }`) -> `DomainError` tipado. O que não é do contrato vira `internal`. */
export function parseDomainError(body: unknown): DomainError {
  if (typeof body !== 'object' || body === null) return { code: 'internal' }
  const fields = Object.fromEntries(Object.entries(body))
  const code = field(fields, 'code')
  if (typeof code !== 'string') return { code: 'internal' }
  if (isSimple(code)) return { code }
  if (isVisitQrCode(code)) return { code }
  if (code === 'notFound') {
    const entity = field(fields, 'entity')
    return isEntity(entity) ? { code, entity } : { code: 'internal' }
  }
  if (code === 'checkInCooldown' || code === 'birthdayLocked') {
    const key = code === 'checkInCooldown' ? 'availableAt' : 'changeableAt'
    const date = IsoDateTimeSchema.safeParse(field(fields, key))
    if (!date.success) return { code: 'internal' }
    return code === 'checkInCooldown' ? { code, availableAt: date.data } : { code, changeableAt: date.data }
  }
  if (code === 'rewardNotReady') {
    const remaining = field(fields, 'remaining')
    return typeof remaining === 'number' ? { code, remaining } : { code: 'internal' }
  }
  return { code: 'internal' }
}

export function isTransportError(error: DomainError): error is TransportError {
  return error.code === 'unauthorized' || error.code === 'network' || error.code === 'rateLimited' || error.code === 'internal'
}

export function hasCode<C extends DomainErrorCode>(error: DomainError, codes: readonly C[]): error is ErrorOf<C> {
  return codes.some((code) => code === error.code)
}
