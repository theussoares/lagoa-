import { Injectable } from '@nestjs/common'
import { unitOf } from '#shared/domain/programStrategies'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import { type CheckInResult, CheckInResultSchema } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { normalizeReadableCode } from '#shared/utils/readableCode'
import { addHours, toIso } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { CheckInRepository } from './check-in.repository'
import { decideCheckIn } from './check-in.rules'

export type CheckInError = ErrorOf<'invalidShopQr' | 'checkInDisabled' | 'checkInCooldown' | 'unauthorized'>

@Injectable()
export class CheckInService {
  constructor(
    private readonly repository: CheckInRepository,
    private readonly clock: Clock,
  ) {}

  async checkIn(customerId: string, rawCode: string): Promise<Result<CheckInResult, CheckInError>> {
    const code = CheckInCodeSchema.safeParse(normalizeReadableCode(rawCode))
    if (!code.success) return err({ code: 'invalidShopQr' })
    const target = await this.repository.findShopByCode(code.data)
    if (target === null) return err({ code: 'invalidShopQr' })
    if (!target.checkInEnabled) return err({ code: 'checkInDisabled' })

    const now = this.clock.now()
    const recorded = await this.repository.record({ customerId, shop: target, now }, (state) =>
      decideCheckIn(target, target.cooldownHours, state, now),
    )
    if (!recorded.ok) return recorded

    const { shop } = target
    const { rules } = shop.program
    const { cardId, entryId, plan } = recorded.value
    const unit = unitOf(rules)
    return ok(
      CheckInResultSchema.parse({
        activity: {
          id: entryId,
          shopId: shop.id,
          shopName: shop.name,
          kind: 'checkIn',
          unit,
          units: plan.units,
          rewardTitle: null,
          createdAt: toIso(now),
        },
        card: { cardId, unit, balance: plan.balanceAfter, target: rules.target, rewardReady: plan.balanceAfter >= rules.target },
        nextCheckInAt: toIso(addHours(now, target.cooldownHours)),
      }),
    )
  }
}
