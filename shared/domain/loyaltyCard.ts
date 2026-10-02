import type { EarnSource, LoyaltyCard, Stamp } from '../schemas/loyaltyCard'
import type { CardProgress } from '../schemas/visit'
import type { ExpirationPolicy } from '../schemas/program'
import { addMonths } from '../utils/time'

type CardBalance = Pick<LoyaltyCard, 'balance' | 'target'>

export function remainingUnits(card: CardBalance): number {
  return Math.max(0, card.target - card.balance)
}

export function isRewardReady(card: CardBalance): boolean {
  return card.balance >= card.target
}

export function toCardProgress(card: LoyaltyCard): CardProgress {
  return {
    cardId: card.id,
    unit: card.unit,
    balance: card.balance,
    target: card.target,
    rewardReady: isRewardReady(card),
  }
}

/** Prêmio liberado primeiro; depois quem está proporcionalmente mais perto. */
export function sortByRewardProximity<T extends CardBalance>(cards: readonly T[]): T[] {
  const distance = (card: T): number => remainingUnits(card) / card.target
  return [...cards].sort((a, b) => distance(a) - distance(b))
}

export function addUnits(
  card: LoyaltyCard,
  units: number,
  source: EarnSource,
  earnedAt: string,
): LoyaltyCard {
  const stamps: Stamp[] =
    card.unit === 'stamp'
      ? [
          ...card.stamps,
          ...Array.from({ length: units }, (_, index) => ({
            number: card.balance + index + 1,
            earnedAt,
            source,
          })),
        ]
      : card.stamps
  return { ...card, balance: card.balance + units, stamps }
}

/** Fecha um ciclo do cartão: desconta o prêmio e renumera o que sobrou. */
export function consumeReward(card: LoyaltyCard): LoyaltyCard {
  const balance = Math.max(0, card.balance - card.target)
  const stamps = card.stamps
    .filter((stamp) => stamp.number > card.target)
    .map((stamp) => ({ ...stamp, number: stamp.number - card.target }))
  return { ...card, balance, stamps, rewardExpiresAt: null }
}

export function isExpiredByInactivity(card: LoyaltyCard, policy: ExpirationPolicy, now: Date): boolean {
  if (policy.kind === 'never' || card.lastVisitAt === null) return false
  return addMonths(new Date(card.lastVisitAt), policy.months) <= now
}
