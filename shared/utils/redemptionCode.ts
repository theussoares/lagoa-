import { RedemptionCodeSchema } from '../schemas/redemption'
import type { RedemptionCode } from '../schemas/redemption'
import { err, ok } from '../types/result'
import type { Result } from '../types/result'
import type { ErrorOf } from '../types/errors'

/** Aceita o que o lojista digitar ("ab3 k9x") e normaliza para o formato do código. */
export function parseRedemptionCode(input: string): Result<RedemptionCode, ErrorOf<'redemptionInvalid'>> {
  const parsed = RedemptionCodeSchema.safeParse(input.replace(/[\s-]/g, '').toUpperCase())
  return parsed.success ? ok(parsed.data) : err({ code: 'redemptionInvalid' })
}
