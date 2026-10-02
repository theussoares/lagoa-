import { isRewardReady, remainingUnits } from '#shared/domain/loyaltyCard'
import { REDEMPTION_CODE_ALPHABET, REDEMPTION_CODE_LENGTH, REDEMPTION_CODE_TTL_MINUTES } from '#shared/constants/domain'
import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import type { Redemption, RedemptionCode } from '#shared/schemas/redemption'
import { RedemptionIdSchema } from '#shared/schemas/ids'
import type { CustomerId, LoyaltyCardId, RedemptionId } from '#shared/schemas/ids'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { addMinutes, toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import type { RedemptionRecord } from '../state'

function toRedemption(record: RedemptionRecord): Redemption {
  const { customerId: _customerId, ...redemption } = record
  return redemption
}

function generateCode(ctx: MockContext): RedemptionCode {
  const activeCodes = new Set(
    ctx.state.redemptions.filter((item) => item.status === 'active').map((item) => item.code),
  )
  for (;;) {
    const raw = Array.from(
      { length: REDEMPTION_CODE_LENGTH },
      () => REDEMPTION_CODE_ALPHABET[ctx.random.int(REDEMPTION_CODE_ALPHABET.length)] ?? 'A',
    ).join('')
    const code = RedemptionCodeSchema.parse(raw)
    if (!activeCodes.has(code)) return code
  }
}

export function requestRedemption(
  ctx: MockContext,
  customerId: CustomerId,
  cardId: LoyaltyCardId,
): Result<Redemption, ErrorOf<'notFound' | 'rewardNotReady'>> {
  const card = ctx.state.cards.find((item) => item.id === cardId && item.customerId === customerId)
  if (card === undefined) return err({ code: 'notFound', entity: 'card' })
  if (!isRewardReady(card)) return err({ code: 'rewardNotReady', remaining: remainingUnits(card) })

  const active = ctx.state.redemptions.find((item) => item.cardId === cardId && item.status === 'active')
  if (active !== undefined) return ok(toRedemption(active))

  const record: RedemptionRecord = {
    id: RedemptionIdSchema.parse(ctx.ids.next('red')),
    code: generateCode(ctx),
    cardId,
    shopId: card.shopId,
    customerId,
    rewardTitle: card.rewardTitle,
    createdAt: toIso(ctx.now),
    expiresAt: toIso(addMinutes(ctx.now, REDEMPTION_CODE_TTL_MINUTES)),
    status: 'active',
  }
  ctx.state.redemptions.push(record)
  return ok(toRedemption(record))
}

export function getRedemption(
  ctx: MockContext,
  customerId: CustomerId,
  redemptionId: RedemptionId,
): Result<Redemption, ErrorOf<'notFound'>> {
  const record = ctx.state.redemptions.find((item) => item.id === redemptionId && item.customerId === customerId)
  return record === undefined ? err({ code: 'notFound', entity: 'redemption' }) : ok(toRedemption(record))
}
