import { Injectable, Logger } from '@nestjs/common'
import { baseUnitsFor, unitOf } from '#shared/domain/programStrategies'
import { type CheckInCode, CheckInCodeSchema } from '#shared/schemas/shop'
import { type CheckInResult, CheckInResultSchema } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { normalizeReadableCode } from '#shared/utils/readableCode'
import { addHours, toIso } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { ReferralSettlement } from '../../ledger/referral-settlement'
import { type CheckInRecorded, CheckInRepository, type CheckInShop, ProgramVersionChanged } from './check-in.repository'
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
    const attempt = await this.record(customerId, code.data, clientKey)
    if (!attempt.ok) return attempt
    const { target, recorded, now } = attempt.value
    if (!recorded.replayed) await this.settleReferral(customerId, target.shop.id, now)

    const { shop } = target
    const { rules } = shop.program
    const { cardId, entryId, units, balanceAfter, recordedAt } = recorded
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

  /** Lê a versão do programa que vale e grava; se o programa mudou entre a leitura e o lock, lê de novo uma vez. */
  private async record(customerId: string, code: CheckInCode, clientKey: string | undefined, retry = true): Promise<Result<{ target: CheckInShop; recorded: CheckInRecorded; now: Date }, CheckInError>> {
    const target = await this.repository.findShopByCode(code, customerId)
    if (target === null) return err({ code: 'invalidShopQr' })
    // Recusar antes da transação: sem lock, sem cartão criado só para ser desfeito.
    const earnsByVisit = baseUnitsFor(target.shop.program.rules, { kind: 'visit' }).ok
    if (!target.checkInEnabled || !earnsByVisit) return err({ code: 'checkInDisabled' })

    const now = this.clock.now()
    try {
      const recorded = await this.repository.record({ customerId, shop: target, now, ...(clientKey !== undefined && { clientKey }) }, (state) =>
        decideCheckIn(target, state, now),
      )
      return recorded.ok ? ok({ target, recorded: recorded.value, now }) : recorded
    } catch (error) {
      if (error instanceof ProgramVersionChanged && retry) return this.record(customerId, code, clientKey, false)
      throw error
    }
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
