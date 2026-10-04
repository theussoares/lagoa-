import { type Redemption, RedemptionSchema } from '#shared/schemas/redemption'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import type { RedemptionRecord } from './redemption.repository'

/** Nunca leva o dono do cartão nem o id do lojista: só o que o cliente mostra no balcão. */
export function toRedemption(record: RedemptionRecord): Result<Redemption, ErrorOf<'redemptionInvalid'>> {
  const parsed = RedemptionSchema.safeParse({
    id: record.id,
    code: record.code,
    cardId: record.cardId,
    shopId: record.shopId,
    rewardTitle: record.rewardTitle,
    createdAt: toIso(record.createdAt),
    expiresAt: toIso(record.expiresAt),
    status: record.status,
  })
  return parsed.success ? ok(parsed.data) : err({ code: 'redemptionInvalid' })
}
