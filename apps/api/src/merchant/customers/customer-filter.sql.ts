import { and, gte, lt, lte, sql, type SQL } from 'drizzle-orm'
import { NEAR_REWARD_PERCENT } from '#shared/constants/domain'
import type { CustomerFilter } from '#shared/schemas/customer'
import { loyaltyCards } from '../../database/schema/cards'
import { programs } from '../../database/schema/shops'

/** Mesmas regras de `isLapsedSince`, `isRewardReady` e `isNearReward`, aplicadas no banco para filtrar antes de paginar e contar. */
export function filterCondition(filter: CustomerFilter, cutoff: Date): SQL | undefined {
  if (filter === 'lapsed') return lte(loyaltyCards.lastVisitAt, cutoff)
  if (filter === 'rewardReady') return gte(loyaltyCards.balance, programs.target)
  if (filter === 'nearReward') {
    return and(
      sql`${loyaltyCards.balance} * 100 >= ${programs.target} * ${NEAR_REWARD_PERCENT}`,
      lt(loyaltyCards.balance, programs.target),
    )
  }
  return undefined
}
