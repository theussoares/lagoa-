import { Injectable } from '@nestjs/common'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import { type ReferralInvite, ReferralCodeSchema } from '#shared/schemas/referral'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { normalizeReadableCode } from '#shared/utils/readableCode'
import { ReferralRepository } from './referral.repository'

@Injectable()
export class ReferralService {
  constructor(private readonly repository: ReferralRepository) {}

  async invite(customerId: string): Promise<Result<ReferralInvite, ErrorOf<'notFound'>>> {
    const code = await this.repository.findOwnReferralCode(customerId)
    const parsed = ReferralCodeSchema.safeParse(code)
    return parsed.success ? ok({ referralCode: parsed.data }) : err({ code: 'notFound', entity: 'customer' })
  }

  /**
   * Guarda o convite que veio no link. A resposta é a mesma para qualquer motivo de não valer (código
   * desconhecido, loja sem indicação, já era cliente...): ninguém usa isto para descobrir quem tem conta ou
   * qual loja paga indicação. Só quem não tem cadastro recebe erro, e esse erro é dele, não de terceiros.
   */
  async capture(customerId: string, rawReferralCode: string, rawShopCode: string): Promise<Result<void, ErrorOf<'unauthorized'>>> {
    const referralCode = ReferralCodeSchema.safeParse(normalizeReadableCode(rawReferralCode))
    const shopCode = CheckInCodeSchema.safeParse(normalizeReadableCode(rawShopCode))
    if (!referralCode.success || !shopCode.success) return ok(undefined)

    const outcome = await this.repository.capture({ referredId: customerId, referralCode: referralCode.data, shopCode: shopCode.data })
    return outcome === 'noProfile' ? err({ code: 'unauthorized' }) : ok(undefined)
  }
}
