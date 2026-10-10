import type { CounterEntry, VisitRegistered, LedgerKind } from '#shared/schemas/visit'
import { formatCurrency } from '#shared/utils/currency'
import { formatTime } from '#shared/utils/dateFormat'
import type { Translate } from '#layers/core/app/types/i18n'
import { unitsText } from '#layers/core/app/utils/units'
import type { RedemptionPreview } from '#shared/schemas/redemption'
import type {
  CounterLedgerEntryModel,
  CounterRedemptionPreviewModel,
  LaunchReceiptModel,
} from '../types/counter'
import type { StampCardBody } from '#layers/ui/app/types/wallet'
import { stampTilt } from '#layers/ui/app/utils/stampTilt'

/** Acima disso a fileira de casas não cabe na coluna do Balcão e vira régua. */
const MAX_SLOTS = 20
const STAMP_STAGGER_MS = 70

const ledgerIcons: Readonly<Record<LedgerKind, string>> = {
  visit: 'i-ph-check-fat-bold',
  amount: 'i-ph-receipt-bold',
  checkIn: 'i-ph-qr-code-bold',
  redemption: 'i-ph-gift-bold',
  campaignBonus: 'i-ph-megaphone-bold',
}

function ledgerAction(entry: CounterEntry, t: Translate): string {
  const earned = unitsText(t, entry.unit, entry.units)
  switch (entry.kind) {
    case 'redemption':
      return t('counter.ledger.redeemed', { reward: entry.rewardTitle ?? '' })
    case 'amount':
      return t('counter.ledger.earnedAmount', { units: earned, amount: formatCurrency(entry.amountCents ?? 0) })
    case 'checkIn':
      return t('counter.ledger.earnedCheckIn', { units: earned })
    case 'visit':
      return t('counter.ledger.earned', { units: earned })
    case 'campaignBonus':
      return t('counter.ledger.earnedCampaign', { units: earned })
  }
}

export function toCounterLedgerModel(entry: CounterEntry, t: Translate, fresh: boolean): CounterLedgerEntryModel {
  return {
    id: entry.id,
    time: formatTime(entry.createdAt),
    // Conta apagada: o servidor manda `null` e o Balcão mostra "Cliente removido" no lugar do celular.
    phone: entry.maskedPhone,
    customerLabel: entry.maskedPhone ?? t('counter.ledger.removedCustomer'),
    badge: entry.isNewCustomer ? t('counter.ledger.newCustomer') : null,
    action: ledgerAction(entry, t),
    tone: entry.kind === 'redemption' ? 'reward' : 'ink',
    icon: ledgerIcons[entry.kind],
    tilt: stampTilt(entry.id),
    fresh,
  }
}

function receiptBody(result: VisitRegistered, t: Translate): StampCardBody {
  const { card, unitsEarned, welcomeUnits } = result
  if (card.unit === 'point' || card.target > MAX_SLOTS) {
    return {
      kind: 'ruler',
      balance: card.balance,
      target: card.target,
      label: t('wallet.card.rulerLabel', { balance: card.balance, target: card.target, unit: t(`units.${card.unit}Noun`, {}, card.target) }),
    }
  }
  const firstFresh = card.balance - unitsEarned - welcomeUnits + 1
  return {
    kind: 'slots',
    slots: Array.from({ length: card.target }, (_, index) => {
      const number = index + 1
      const fresh = number >= firstFresh && number <= card.balance
      return {
        number,
        stamped: number <= card.balance,
        isRewardSlot: number === card.target,
        tilt: stampTilt(card.cardId, number),
        fresh,
        delayMs: fresh ? (number - firstFresh) * STAMP_STAGGER_MS : 0,
      }
    }),
  }
}

/** O recibo do uso do QR da visita: quem ganhou, quanto, e como ficou o cartão. */
export function toLaunchReceipt(result: VisitRegistered, rewardTitle: string, t: Translate): LaunchReceiptModel {
  const { card, entry, unitsEarned, welcomeUnits } = result
  // Conta apagada enquanto o Balcão ainda consulta o QR: o recibo diz "Cliente removido", nunca uma frase sem nome.
  const phone = entry.maskedPhone ?? t('counter.ledger.removedCustomer')
  const remaining = Math.max(0, card.target - card.balance)
  const progress = t('counter.receipt.progress', { balance: card.balance, target: card.target })
  // Cliente antigo também pode estrear cartão nesta loja: as boas-vindas denunciam o cartão novo.
  const isNewCard = entry.isNewCustomer || welcomeUnits > 0

  const title = card.rewardReady
    ? t('counter.receipt.rewardReady', { reward: rewardTitle })
    : isNewCard
      ? t('counter.receipt.newCard', { phone })
      : t('counter.receipt.earned', { units: unitsText(t, card.unit, unitsEarned), phone })

  const parts = [
    welcomeUnits > 0 ? t('counter.receipt.welcome', { units: unitsText(t, card.unit, welcomeUnits) }) : null,
    card.rewardReady
      ? t('counter.receipt.tellCustomer', { phone })
      : `${progress} ${t('counter.receipt.remaining', { units: unitsText(t, card.unit, remaining), reward: rewardTitle }, remaining)}`,
  ]

  return {
    tone: card.rewardReady ? 'reward' : 'ink',
    tilt: stampTilt(card.cardId, card.balance),
    title,
    detail: parts.filter((part) => part !== null).join(' '),
    body: receiptBody(result, t),
  }
}

/** O canhoto conferido: prêmio e a linha do cliente, só com o celular mascarado que o servidor devolveu. */
export function toRedemptionPreviewModel(preview: RedemptionPreview, confirming: boolean, t: Translate): CounterRedemptionPreviewModel {
  return {
    rewardTitle: preview.rewardTitle,
    customerLine: t('counter.redemption.customer', { phone: preview.maskedPhone, time: formatTime(preview.expiresAt) }),
    confirming,
  }
}
