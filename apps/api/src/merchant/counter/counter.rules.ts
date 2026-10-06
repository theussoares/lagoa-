import type { ProgramRules } from '#shared/schemas/program'
import type { ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import type { EarnInput } from '#shared/domain/programStrategies'

export type ShopClosedError = ErrorOf<'shopPendingApproval' | 'shopSuspended'>
export type RegisterVisitRuleError = ErrorOf<'invalidAmount' | 'amountNotAccepted'> | ShopClosedError

export function assertOperationalShop(status: ShopStatus): Result<void, ShopClosedError> {
  if (status === 'pending') return err({ code: 'shopPendingApproval' })
  if (status === 'suspended') return err({ code: 'shopSuspended' })
  return ok(undefined)
}

export function validateRegisterInput(rules: ProgramRules, input: EarnInput): Result<void, ErrorOf<'invalidAmount' | 'amountNotAccepted'>> {
  if (input.kind === 'amount') {
    if (rules.mode !== 'pointsPerCurrency') {
      return err({ code: 'amountNotAccepted' })
    }
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return err({ code: 'invalidAmount' })
    }
  }
  return ok(undefined)
}
