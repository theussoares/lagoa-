import { Injectable } from '@nestjs/common'
import { REDEMPTION_CODE_LENGTH, REDEMPTION_CODE_TTL_MINUTES } from '#shared/constants/domain'
import type { Redemption } from '#shared/schemas/redemption'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { addMinutes } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { generateReadableCode } from '../../common/readable-code'
import { toRedemption } from './redemption.mapper'
import { type RedemptionRecord, RedemptionRepository } from './redemption.repository'
import { decideRedemptionRequest } from './redemption.rules'

export type RequestRedemptionError = ErrorOf<'notFound' | 'rewardNotReady'>

@Injectable()
export class RedemptionService {
  constructor(
    private readonly repository: RedemptionRepository,
    private readonly clock: Clock,
  ) {}

  /** Gera (ou devolve o ainda válido) código de resgate do cartão. */
  async requestCode(customerId: string, cardId: string): Promise<Result<Redemption, RequestRedemptionError>> {
    const now = this.clock.now()
    const recorded = await this.repository.request(
      {
        customerId,
        cardId,
        createdAt: now,
        expiresAt: addMinutes(now, REDEMPTION_CODE_TTL_MINUTES),
        newCode: () => generateReadableCode(REDEMPTION_CODE_LENGTH),
      },
      (state) => decideRedemptionRequest(state, now),
    )
    return recorded.ok ? ok(this.present(recorded.value)) : err(recorded.error)
  }

  /** Para a tela do código saber quando o lojista confirmou ou quando venceu. */
  async get(customerId: string, redemptionId: string): Promise<Result<Redemption, ErrorOf<'notFound'>>> {
    const record = await this.repository.find(customerId, redemptionId, this.clock.now())
    return record === null ? err({ code: 'notFound', entity: 'redemption' }) : ok(this.present(record))
  }

  /** Linha nossa que não cabe no contrato é defeito do servidor (500), não "não encontrado". */
  private present(record: RedemptionRecord): Redemption {
    const redemption = toRedemption(record)
    if (!redemption.ok) throw new Error(`Redemption ${record.id} breaks the contract`)
    return redemption.value
  }
}
