import { isRewardReady, remainingUnits } from '#shared/domain/loyaltyCard'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { ReadyRewardModel, UpcomingRewardModel } from '#layers/ui/app/types/rewards'
import type { Translate } from '#layers/core/app/utils/translate'
import { stampTilt } from '#layers/ui/app/utils/stampTilt'
import { categoryIcon } from './categoryIcon'

export interface RewardGroups {
  readonly ready: readonly WalletCard[]
  /** Na ordem da carteira: o mais perto do prêmio primeiro. */
  readonly upcoming: readonly WalletCard[]
}

export function groupRewards(cards: readonly WalletCard[]): RewardGroups {
  return {
    ready: cards.filter((card) => isRewardReady(card)),
    upcoming: cards.filter((card) => !isRewardReady(card)),
  }
}

export function toReadyRewardModel(card: WalletCard, t: Translate, formatDate: (iso: string) => string): ReadyRewardModel {
  return {
    id: card.id,
    to: `/premios/${card.id}`,
    shopName: card.shop.name,
    icon: categoryIcon(card.shop.category),
    reward: card.rewardTitle,
    note: card.rewardExpiresAt === null ? null : t('wallet.card.heldUntil', { date: formatDate(card.rewardExpiresAt) }),
    tilt: stampTilt(card.id, card.target),
  }
}

export function toUpcomingRewardModel(card: WalletCard, t: Translate): UpcomingRewardModel {
  const remaining = remainingUnits(card)
  const units = t(`units.${card.unit}`, {}, remaining)
  return {
    id: card.id,
    shopName: card.shop.name,
    icon: categoryIcon(card.shop.category),
    reward: card.rewardTitle,
    count: String(remaining),
    countLabel: t('rewards.remainingLabel', {}, remaining),
    progressLabel: t('wallet.card.rulerLabel', {
      balance: card.balance,
      target: card.target,
      unit: t(`units.${card.unit}Noun`, {}, card.target),
    }),
    fraction: Math.min(1, card.balance / card.target),
    tilt: stampTilt(card.id, 1),
    summary: t(
      'wallet.card.summary',
      { shop: card.shop.name, balance: card.balance, target: card.target, units, reward: card.rewardTitle },
      remaining,
    ),
  }
}

/** "O mais perto: faltam 2 carimbos para Corte grátis na Barbearia Navalha." */
export function closestRewardLine(card: WalletCard, t: Translate): string {
  const remaining = remainingUnits(card)
  return t(
    'rewards.closest',
    { units: t(`units.${card.unit}`, {}, remaining), reward: card.rewardTitle, shop: card.shop.name },
    remaining,
  )
}
