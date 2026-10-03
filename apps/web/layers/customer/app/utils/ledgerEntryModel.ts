import type { WalletActivity } from '#shared/schemas/visit'
import { formatShortDate, formatTime } from '#shared/utils/dateFormat'
import { addDays, localDateParts } from '#shared/utils/time'
import type { LedgerEntryModel } from '#layers/ui/app/types/wallet'
import type { Translate } from '#layers/core/app/types/i18n'

/** "14:32" hoje, "Ontem" e depois "12 de set." — no fuso da cidade, não do aparelho. */
export function formatLedgerWhen(iso: string, now: Date, t: Translate): string {
  const date = new Date(iso)
  const day = localDateParts(date).isoDate
  if (day === localDateParts(now).isoDate) return formatTime(iso)
  if (day === localDateParts(addDays(now, -1)).isoDate) return t('ledger.yesterday')
  return formatShortDate(iso)
}

export function toLedgerEntryModel(activity: WalletActivity, now: Date, t: Translate): LedgerEntryModel {
  const base = { id: activity.id, when: formatLedgerWhen(activity.createdAt, now, t), title: activity.shopName }
  if (activity.kind === 'redemption') {
    return {
      ...base,
      detail: activity.rewardTitle ?? t('ledger.kind.redemption'),
      delta: t('ledger.redeemed'),
      tone: 'reward',
    }
  }
  return {
    ...base,
    detail: t(`ledger.kind.${activity.kind}`),
    delta: t('ledger.earned', { units: t(`units.${activity.unit}`, {}, activity.units) }),
    tone: 'ink',
  }
}
