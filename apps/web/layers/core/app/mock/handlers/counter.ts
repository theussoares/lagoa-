import { consumeReward } from '#shared/domain/loyaltyCard'
import { isCounterKind } from '#shared/domain/ledger'
import { welcomeUnits } from '#shared/domain/bonusRules'
import { addUnits } from '#shared/domain/loyaltyCard'
import type { RedemptionId, ShopId } from '#shared/schemas/ids'
import type { RedemptionCode, RedemptionPreview } from '#shared/schemas/redemption'
import type { CounterEntry } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { localDateParts, toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import { appendLedger, toCounterEntry } from './earning'
import { findProgram, maskedPhoneOf, replaceCard } from './queries'
import { requireOperationalShop } from './shopAccess'
import type { ShopAccessError } from './shopAccess'
import type { RedemptionRecord } from '../state'

type ValidateError = ErrorOf<'redemptionInvalid' | 'redemptionExpired' | 'redemptionAlreadyUsed'>

function findRedemptionForShop(
  ctx: MockContext,
  shopId: ShopId,
  match: (redemption: RedemptionRecord) => boolean,
): Result<RedemptionRecord, ValidateError> {
  // Código de outra loja responde igual a código inexistente: não vaza que ele existe.
  const redemption = ctx.state.redemptions.find((item) => item.shopId === shopId && match(item))
  if (redemption === undefined) return err({ code: 'redemptionInvalid' })
  if (redemption.status === 'expired') return err({ code: 'redemptionExpired' })
  if (redemption.status === 'redeemed') return err({ code: 'redemptionAlreadyUsed' })
  return ok(redemption)
}

export function validateRedemption(
  ctx: MockContext,
  shopId: ShopId,
  code: RedemptionCode,
): Result<RedemptionPreview, ValidateError | ShopAccessError> {
  const shop = requireOperationalShop(ctx, shopId)
  if (!shop.ok) return shop
  const found = findRedemptionForShop(ctx, shopId, (item) => item.code === code)
  if (!found.ok) return found
  const maskedPhone = maskedPhoneOf(ctx, found.value.customerId)
  if (maskedPhone === undefined) return err({ code: 'redemptionInvalid' })
  return ok({
    redemptionId: found.value.id,
    rewardTitle: found.value.rewardTitle,
    maskedPhone,
    expiresAt: found.value.expiresAt,
  })
}

export function confirmRedemption(
  ctx: MockContext,
  shopId: ShopId,
  redemptionId: RedemptionId,
): Result<CounterEntry, ValidateError | ShopAccessError> {
  const shop = requireOperationalShop(ctx, shopId)
  if (!shop.ok) return shop
  const found = findRedemptionForShop(ctx, shopId, (item) => item.id === redemptionId)
  if (!found.ok) return found
  const redemption = found.value
  const card = ctx.state.cards.find((item) => item.id === redemption.cardId)
  const program = findProgram(ctx, shopId)
  if (card === undefined || program === undefined) return err({ code: 'redemptionInvalid' })

  ctx.state.redemptions = ctx.state.redemptions.map((item) =>
    item.id === redemption.id ? { ...item, status: 'redeemed' } : item,
  )
  // Regra de negócio: com boas-vindas ligada, o próximo cartão já começa andado.
  const consumed = consumeReward(card)
  const restartUnits = welcomeUnits(program.bonusRules)
  replaceCard(ctx, restartUnits > 0 ? addUnits(consumed, restartUnits, 'welcomeBonus', toIso(ctx.now)) : consumed)

  const record = appendLedger(ctx, {
    shopId,
    customerId: redemption.customerId,
    kind: 'redemption',
    unit: card.unit,
    units: 0,
    amountCents: null,
    rewardTitle: redemption.rewardTitle,
    isNewCustomer: false,
  })
  const entry = toCounterEntry(ctx, record)
  return entry.ok ? entry : err({ code: 'redemptionInvalid' })
}

export function todayEntries(ctx: MockContext, shopId: ShopId): CounterEntry[] {
  const today = localDateParts(ctx.now).isoDate
  return ctx.state.ledger
    .filter(
      (record) =>
        record.shopId === shopId && isCounterKind(record.kind) && localDateParts(new Date(record.createdAt)).isoDate === today,
    )
    // Mais novo primeiro; no mesmo instante, o último lançado primeiro.
    .toReversed()
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((record) => {
      const entry = toCounterEntry(ctx, record)
      return entry.ok ? [entry.value] : []
    })
}
