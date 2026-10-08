import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { ShopJoinResult } from '#shared/schemas/shop'
import type { CheckInResult } from '#shared/schemas/visit'
import type { Translate } from '#layers/core/app/types/i18n'
import type { CheckInError } from '../services/CheckInService'
import { formatWhen } from '#layers/core/app/utils/formatWhen'
import { pendingWelcomeUnits } from './pendingWelcome'
import type { CheckInRecovery, CheckInSource, CheckInNoticeModel, CheckInMoment, CheckInEarnedModel, CheckInJoinedModel } from '../types/checkIn'

const visitQrNoticeTitle = {
  invalidVisitQr: 'invalidVisitQrTitle',
  visitQrExpired: 'visitQrExpiredTitle',
  visitQrAlreadyUsed: 'visitQrUsedTitle',
  visitQrStale: 'visitQrStaleTitle',
} as const

type VisitQrErrorCode = keyof typeof visitQrNoticeTitle

/** Todo QR da visita que não vale leva ao mesmo caminho: pedir um novo no caixa. */
function visitQrNotice(code: VisitQrErrorCode, t: Translate): CheckInNoticeModel {
  return {
    tone: 'error',
    icon: 'i-ph-qr-code',
    title: t(`checkIn.notice.${visitQrNoticeTitle[code]}`),
    message: t(`errors.${code}`),
    recovery: 'scanAgain',
  }
}

function errorNotice(code: 'rateLimited' | 'internal' | 'termsNotAccepted', recovery: CheckInRecovery, t: Translate): CheckInNoticeModel {
  return { tone: 'error', icon: 'i-ph-warning-circle', title: t('checkIn.notice.errorTitle'), message: t(`errors.${code}`), recovery }
}

/**
 * Aviso que substitui a câmera depois de uma tentativa. Código digitado que não existe
 * (loja ou visita) não vira aviso (o erro fica no próprio campo) e sessão vencida leva ao login.
 */
export function toCheckInNotice(error: CheckInError, source: CheckInSource, now: Date, t: Translate): CheckInNoticeModel | null {
  switch (error.code) {
    case 'checkInCooldown':
      return {
        tone: 'warning',
        icon: 'i-ph-clock-countdown',
        title: t('checkIn.notice.cooldownTitle'),
        message: t('checkIn.notice.cooldown', { when: formatWhen(error.availableAt, now, t) }),
        recovery: 'wallet',
      }
    case 'checkInDisabled':
      return {
        tone: 'warning',
        icon: 'i-ph-storefront',
        title: t('checkIn.notice.joinDisabledTitle'),
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
    case 'invalidVisitQr':
      if (source === 'typed') return null
      return visitQrNotice(error.code, t)
    case 'visitQrExpired':
    case 'visitQrAlreadyUsed':
    case 'visitQrStale':
      return visitQrNotice(error.code, t)
    case 'network':
      return {
        tone: 'error',
        icon: 'i-ph-wifi-slash',
        title: t('checkIn.notice.networkTitle'),
        message: t('errors.network'),
        recovery: 'retry',
      }
    case 'rateLimited':
      // Tentar o mesmo código de novo só gasta mais tentativas: quem digitou volta para a câmera.
      return errorNotice(error.code, source === 'typed' ? 'scanAgain' : 'retry', t)
    case 'internal':
    case 'termsNotAccepted':
      return errorNotice(error.code, 'retry', t)
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
    next: t('checkIn.earned.next', { when: formatWhen(result.nextCheckInAt, now, t) }),
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

function pendingWelcome(card: WalletCard | null, t: Translate): string | null {
  const welcomeUnits = pendingWelcomeUnits(card)
  if (card === null || welcomeUnits === 0) return null
  return t('checkIn.joined.welcome', { units: t(`units.${card.unit}`, {}, welcomeUnits) })
}

/** Tela "entrou no clube": a loja vem do cartão; sem ele (rede caiu no meio) o texto fala só da loja em geral. */
export function toCheckInJoinedModel(result: ShopJoinResult, card: WalletCard | null, t: Translate): CheckInJoinedModel {
  const title = result.alreadyMember ? t('checkIn.joined.titleAgain') : t('checkIn.joined.title')
  const lead = card === null ? t('checkIn.joined.leadNoShop') : t('checkIn.joined.lead', { shop: card.shop.name })
  return {
    title,
    lead,
    welcome: pendingWelcome(card, t),
    next: t('checkIn.joined.next'),
    announcement: t('checkIn.joined.announce', { title, lead }),
  }
}
