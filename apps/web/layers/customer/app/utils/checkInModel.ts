import type { CheckInResult } from '#shared/schemas/visit'
import { addDays, localDateParts } from '#shared/utils/time'
import type { Translate } from '#layers/core/app/types/i18n'
import type { CheckInError } from '../services/CheckInService'
import { formatShortDate, formatTime } from './ledgerEntryModel'
import type { CheckInSource, CheckInNoticeModel, CheckInMoment, CheckInEarnedModel } from '../types/checkIn'

/** "hoje às 18:40", "amanhã às 09:00", "em 5 de out. às 09:00" — no fuso da cidade. */
export function formatCheckInWhen(iso: string, now: Date, t: Translate): string {
  const time = formatTime(iso)
  const day = localDateParts(new Date(iso)).isoDate
  if (day === localDateParts(now).isoDate) return t('checkIn.when.today', { time })
  if (day === localDateParts(addDays(now, 1)).isoDate) return t('checkIn.when.tomorrow', { time })
  return t('checkIn.when.later', { date: formatShortDate(iso), time })
}

/**
 * Aviso que substitui a câmera depois de uma tentativa. Código digitado errado
 * não vira aviso (o erro fica no próprio campo) e sessão vencida leva ao login.
 */
export function toCheckInNotice(error: CheckInError, source: CheckInSource, now: Date, t: Translate): CheckInNoticeModel | null {
  switch (error.code) {
    case 'checkInCooldown':
      return {
        tone: 'warning',
        icon: 'i-ph-clock-countdown',
        title: t('checkIn.notice.cooldownTitle'),
        message: t('checkIn.notice.cooldown', { when: formatCheckInWhen(error.availableAt, now, t) }),
        recovery: 'wallet',
      }
    case 'checkInDisabled':
      return {
        tone: 'warning',
        icon: 'i-ph-storefront',
        title: t('checkIn.notice.disabledTitle'),
        message: t('errors.checkInDisabled'),
        recovery: 'wallet',
      }
    case 'invalidShopQr':
      if (source === 'typed') return null
      return {
        tone: 'error',
        icon: 'i-ph-qr-code',
        title: t('checkIn.notice.invalidQrTitle'),
        message: t('errors.invalidShopQr'),
        recovery: 'scanAgain',
      }
    case 'network':
      return {
        tone: 'error',
        icon: 'i-ph-wifi-slash',
        title: t('checkIn.notice.networkTitle'),
        message: t('errors.network'),
        recovery: 'retry',
      }
    case 'unauthorized':
      return null
  }
}

/** Saldo "já visto" do cartão na tela de carimbo ganho: só o que acabou de cair recebe a batida. */
export function seenBalanceBefore(result: CheckInResult): number {
  return Math.max(0, result.card.balance - result.activity.units)
}

/** `cardSummary` é a frase do cartão para leitor de tela, quando o cartão carregou. */
export function toCheckInEarnedModel(result: CheckInResult, cardSummary: string | null, now: Date, t: Translate): CheckInEarnedModel {
  const { unit, units } = result.activity
  const moment = checkInMoment(result)
  const remaining = result.card.target - result.card.balance
  const title = moment === 'reward' ? t('checkIn.earned.title.reward') : t(`checkIn.earned.title.${unit}`)
  const cheer = moment === 'almost' ? t('checkIn.earned.almost', { units: t(`units.${unit}`, { count: remaining }, remaining) }, remaining) : null
  return {
    moment,
    title,
    lead: t('checkIn.earned.lead', { units: t(`units.${unit}`, {}, units) }),
    cheer,
    next: t('checkIn.earned.next', { when: formatCheckInWhen(result.nextCheckInAt, now, t) }),
    announcement: earnedAnnouncement(title, cheer, cardSummary, t),
  }
}

function earnedAnnouncement(title: string, cheer: string | null, cardSummary: string | null, t: Translate): string {
  if (cheer === null) return cardSummary === null ? title : t('checkIn.earned.announce', { title, summary: cardSummary })
  return t('checkIn.earned.announceCheer', { title, cheer, summary: cardSummary ?? '' }).trim()
}

/**
 * Prêmio só na batida que cruzou a meta: com o prêmio guardado, as visitas seguintes
 * voltam a ser comuns. Quase lá = mais uma visita igual a esta (com o mesmo bônus) fecha o cartão.
 */
function checkInMoment(result: CheckInResult): CheckInMoment {
  if (result.card.rewardReady) return seenBalanceBefore(result) < result.card.target ? 'reward' : 'earned'
  const remaining = result.card.target - result.card.balance
  return remaining > 0 && remaining <= result.activity.units ? 'almost' : 'earned'
}
