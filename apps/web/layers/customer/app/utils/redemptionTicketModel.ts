import type { Redemption } from '#shared/schemas/redemption'
import type { RedemptionTicketState } from '#layers/ui/app/types/redemption'
import type { Translate } from '#layers/core/app/utils/translate'

/** No último minuto a contagem vira aviso (MASTER: "código perto de expirar"). */
export const REDEMPTION_URGENT_SECONDS = 60

export function secondsUntil(iso: string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 1000))
}

/** 582 → "9:42". */
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function validitySeconds(redemption: Redemption): number {
  return Math.max(1, secondsUntil(redemption.expiresAt, new Date(redemption.createdAt)))
}

export function toRedemptionTicketState(
  redemption: Redemption,
  remainingSeconds: number,
  t: Translate,
): RedemptionTicketState {
  if (redemption.status === 'redeemed') {
    return { kind: 'redeemed', seal: t('redemption.redeemedSeal'), note: t('redemption.redeemedNote') }
  }
  if (redemption.status === 'expired') {
    return { kind: 'expired', code: redemption.code, note: t('redemption.expiredNote') }
  }
  return {
    kind: 'active',
    code: redemption.code,
    clock: formatClock(remainingSeconds),
    clockLabel: t('redemption.validFor'),
    urgent: remainingSeconds <= REDEMPTION_URGENT_SECONDS,
    remainingFraction: Math.min(1, remainingSeconds / validitySeconds(redemption)),
  }
}

/** Frase para o aviso de leitor de tela, que só muda quando vira o minuto. */
export function minutesLeftAnnouncement(remainingSeconds: number, t: Translate): string {
  const minutes = Math.ceil(remainingSeconds / 60)
  return t('redemption.minutesLeft', { minutes }, minutes)
}
