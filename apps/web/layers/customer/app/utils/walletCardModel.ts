import { isRewardReady, remainingUnits } from '#shared/domain/loyaltyCard'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { StampCardBody, StampCardModel, StampCardStatus, StampSlotModel } from '#layers/ui/app/types/wallet'
import type { Translate } from '#layers/core/app/types/i18n'
import { stampTilt } from '#layers/ui/app/utils/stampTilt'
import { categoryIcon } from './categoryIcon'

/** Acima disso a grade de casas deixa de caber em 390px e o cartão vira régua. */
const MAX_SLOTS = 20
const STAMP_STAGGER_MS = 70

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

function slotsFor(card: WalletCard, seenBalance: number): StampSlotModel[] {
  const stamped = Math.min(card.balance, card.target)
  return Array.from({ length: card.target }, (_, index) => {
    const number = index + 1
    const fresh = number <= stamped && number > seenBalance
    return {
      number,
      stamped: number <= stamped,
      isRewardSlot: number === card.target,
      tilt: stampTilt(card.id, number),
      fresh,
      delayMs: fresh ? (number - seenBalance - 1) * STAMP_STAGGER_MS : 0,
    }
  })
}

function bodyFor(card: WalletCard, seenBalance: number, t: Translate): StampCardBody {
  if (card.unit === 'stamp' && card.target <= MAX_SLOTS) {
    return { kind: 'slots', slots: slotsFor(card, seenBalance) }
  }
  return {
    kind: 'ruler',
    balance: card.balance,
    target: card.target,
    label: t('wallet.card.rulerLabel', { balance: card.balance, target: card.target, unit: t(`units.${card.unit}Noun`, {}, card.target) }),
  }
}

function statusFor(card: WalletCard, seenBalance: number, t: Translate, formatDate: (iso: string) => string): StampCardStatus {
  if (isRewardReady(card)) {
    return {
      kind: 'ready',
      seal: t('wallet.card.seal'),
      reward: card.rewardTitle,
      note: card.rewardExpiresAt === null ? null : t('wallet.card.heldUntil', { date: formatDate(card.rewardExpiresAt) }),
      fresh: seenBalance < card.target,
    }
  }
  const remaining = remainingUnits(card)
  return {
    kind: 'remaining',
    count: String(remaining),
    unitLine: t(`wallet.card.unitsFor.${card.unit}`, {}, remaining),
    reward: card.rewardTitle,
  }
}

export interface WalletCardModelOptions {
  readonly t: Translate
  /** Saldo que a pessoa já tinha visto neste cartão; o que passar disso recebe a batida. */
  readonly seenBalance: number
  readonly formatDate: (iso: string) => string
}

export function toStampCardModel(card: WalletCard, options: WalletCardModelOptions): StampCardModel {
  const { t, seenBalance, formatDate } = options
  const ready = isRewardReady(card)
  const remaining = remainingUnits(card)
  const units = t(`units.${card.unit}`, {}, remaining)
  const width = String(card.target).length
  return {
    id: card.id,
    shopName: card.shop.name,
    shopDetail: card.shop.neighborhood,
    icon: categoryIcon(card.shop.category),
    progress: `${pad(Math.min(card.balance, card.target), width)}/${pad(card.target, width)}`,
    body: bodyFor(card, seenBalance, t),
    status: statusFor(card, seenBalance, t, formatDate),
    peek: ready ? t('wallet.card.peekReady') : t('wallet.card.peekRemaining', { units }, remaining),
    summary: ready
      ? t('wallet.card.summaryReady', { shop: card.shop.name, reward: card.rewardTitle })
      : t('wallet.card.summary', { shop: card.shop.name, balance: card.balance, target: card.target, units, reward: card.rewardTitle }, remaining),
    rewardReady: ready,
  }
}
