import { Injectable, Logger } from '@nestjs/common'
import { baseUnitsFor, unitOf } from '#shared/domain/programStrategies'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import { type CheckInResult, CheckInResultSchema } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { normalizeReadableCode } from '#shared/utils/readableCode'
import { addHours, toIso } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { ReferralSettlement } from '../../ledger/referral-settlement'
import { CheckInRepository } from './check-in.repository'
import { decideCheckIn } from './check-in.rules'

export type CheckInError = ErrorOf<'invalidShopQr' | 'checkInDisabled' | 'checkInCooldown' | 'unauthorized'>

@Injectable()
export class CheckInService {
  constructor(
    private readonly repository: CheckInRepository,
    private readonly clock: Clock,
    private readonly referrals: ReferralSettlement,
  ) {}

  private readonly logger = new Logger(CheckInService.name)

  async checkIn(customerId: string, rawCode: string, clientKey?: string): Promise<Result<CheckInResult, CheckInError>> {
    const code = CheckInCodeSchema.safeParse(normalizeReadableCode(rawCode))
    if (!code.success) return err({ code: 'invalidShopQr' })
    const target = await this.repository.findShopByCode(code.data)
    if (target === null) return err({ code: 'invalidShopQr' })
    // Recusar antes da transação: sem lock, sem cartão criado só para ser desfeito.
    const earnsByVisit = baseUnitsFor(target.shop.program.rules, { kind: 'visit' }).ok
    if (!target.checkInEnabled || !earnsByVisit) return err({ code: 'checkInDisabled' })

    const now = this.clock.now()
    const recorded = await this.repository.record({ customerId, shop: target, now, ...(clientKey !== undefined && { clientKey }) }, (state) =>
      decideCheckIn(target, state, now),
    )
    if (!recorded.ok) return recorded

    if (!recorded.value.replayed) await this.settleReferral(customerId, target.shop.id, now)

    const { shop } = target
    const { rules } = shop.program
    const { cardId, entryId, units, balanceAfter, recordedAt } = recorded.value
    const unit = unitOf(rules)
    return ok(
      CheckInResultSchema.parse({
        activity: {
          id: entryId,
          shopId: shop.id,
          shopName: shop.name,
          kind: 'checkIn',
          unit,
          units,
          rewardTitle: null,
          createdAt: toIso(recordedAt),
        },
        card: { cardId, unit, balance: balanceAfter, target: rules.target, rewardReady: balanceAfter >= rules.target },
        nextCheckInAt: toIso(addHours(recordedAt, target.cooldownHours)),
      }),
    )
  }

  /**
   * A visita já está confirmada. Pagar a indicação é à parte e não pode derrubar o check-in: se falhar,
   * a pendência continua e o log leva só o tipo do erro. Roda a cada check-in (uma consulta pelo índice único
   * `(loja, indicado)`), então uma falha passageira é tentada de novo na visita seguinte; o pagamento é
   * idempotente e só acontece com cartão existente e criado depois do convite.
   */
  private async settleReferral(customerId: string, shopId: string, now: Date): Promise<void> {
    try {
      await this.referrals.settlePending(customerId, shopId, now)
    } catch (error) {
      this.logger.error(`Referral settlement failed (${error instanceof Error ? error.name : 'unknown'}) for shop ${shopId}`)
    }
  }
}
