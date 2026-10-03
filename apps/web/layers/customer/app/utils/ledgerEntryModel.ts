import type { WalletActivity } from '#shared/schemas/visit'
import { addDays, localDateParts, PILOT_TIME_ZONE } from '#shared/utils/time'
import type { LedgerEntryModel } from '#layers/ui/app/types/wallet'
import { stampTilt } from '#layers/ui/app/utils/stampTilt'
import type { Translate } from '#layers/core/app/utils/translate'

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: PILOT_TIME_ZONE })
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: PILOT_TIME_ZONE })
const dayFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: PILOT_TIME_ZONE })

/** "14:32" hoje, "Ontem" e depois "12 de set." — no fuso da cidade, não do aparelho. */
export function formatLedgerWhen(iso: string, now: Date, t: Translate): string {
  const date = new Date(iso)
  const day = localDateParts(date).isoDate
  if (day === localDateParts(now).isoDate) return timeFormat.format(date)
  if (day === localDateParts(addDays(now, -1)).isoDate) return t('ledger.yesterday')
  return dayFormat.format(date)
}

export function formatShortDate(iso: string): string {
  return dayFormat.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

const FALLBACK_STAMP_ICON = 'i-ph-seal-check'

/** `iconByShop`: o carimbo de cada loja; sem ele a linha usa um carimbo genérico. */
export function toLedgerEntryModel(
  activity: WalletActivity,
  now: Date,
  t: Translate,
  iconByShop: ReadonlyMap<string, string> = new Map(),
): LedgerEntryModel {
  const base = {
    id: activity.id,
    month: monthFormat.format(new Date(activity.createdAt)),
    when: formatLedgerWhen(activity.createdAt, now, t),
    title: activity.shopName,
    icon: iconByShop.get(activity.shopId) ?? FALLBACK_STAMP_ICON,
    tilt: stampTilt(activity.shopId),
  }
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
