import { baseUnitsFor } from '#shared/domain/programStrategies'
import { formatTime } from '#shared/utils/dateFormat'
import { formatCurrency } from '#shared/utils/currency'
import { visitQrLink } from '#shared/utils/checkInCode'
import type { QrPath } from '#layers/ui/app/types/qr'
import type { VisitToken } from '#shared/schemas/visitQr'
import type { Translate } from '#layers/core/app/types/i18n'
import { formatWhen } from '#layers/core/app/utils/formatWhen'
import { unitsText } from '#layers/core/app/utils/units'
import { qrPath } from '#layers/ui/app/utils/qrPath'
import type { CounterAction } from '../types/counter'
import type { VisitQrDisplayInput, VisitQrDisplayModel, VisitQrIssueText } from '../types/visitQr'
import { toLaunchReceipt } from './counterModels'

const SECONDS_PER_MINUTE = 60
const MS_PER_SECOND = 1000

/**
 * Segundos até vencer pelo relógio do servidor: `skewMs` é (relógio do servidor − relógio daqui) medido na emissão,
 * então um relógio de balcão adiantado ou atrasado não mostra uma contagem errada.
 */
export function visitQrRemainingSeconds(expiresAt: string, localNow: number, skewMs: number): number {
  const remainingMs = Date.parse(expiresAt) - (localNow + skewMs)
  return Math.max(0, Math.ceil(remainingMs / MS_PER_SECOND))
}

/** "4:12" */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Pontos antes de bônus que o valor rende no modo por real (mesma conta do servidor). */
function basePointsOf(pointsPerReal: number, amountCents: number): number | null {
  const units = baseUnitsFor({ mode: 'pointsPerCurrency', pointsPerReal, target: 1 }, { kind: 'amount', amountCents })
  return units.ok ? units.value : null
}

/** Botão de gerar e dica do valor do formulário do QR da visita. */
export function toVisitQrIssueText(action: CounterAction | null, amountCents: number, t: Translate): VisitQrIssueText {
  const plain = t('counter.visitQr.issue')
  if (action?.kind !== 'amount') return { issueLabel: plain, amountHint: undefined, amountPreview: undefined }
  const amountHint = t('counter.visitQr.amountHint', { points: unitsText(t, 'point', action.pointsPerReal) })
  const points = amountCents > 0 ? basePointsOf(action.pointsPerReal, amountCents) : null
  if (points === null) return { issueLabel: plain, amountHint, amountPreview: undefined }
  const amount = formatCurrency(amountCents)
  return {
    issueLabel: t('counter.visitQr.issueAmount', { amount }),
    amountHint,
    amountPreview: t('counter.visitQr.amountPreview', { amount, points: unitsText(t, 'point', points) }),
  }
}

/** O desenho do QR da visita; fora do modelo de exibição para não refazer a cada segundo da contagem. */
export function toVisitQrCode(origin: string, token: VisitToken): QrPath {
  return qrPath(visitQrLink(origin, token))
}

/** O QR no ar: o desenho, o código para digitar, a situação e, se já foi usado, o recibo do cartão. */
export function toVisitQrDisplayModel(input: VisitQrDisplayInput, now: Date, t: Translate): VisitQrDisplayModel {
  const { qr, qrCode, remainingSeconds, rewardTitle } = input
  return {
    qr: qrCode,
    qrLabel: t('counter.visitQr.qrLabel', { time: formatTime(qr.expiresAt) }),
    visitCode: qr.visitCode,
    status: qr.status,
    statusLabel: t(`counter.visitQr.status.${qr.status}`),
    countdown: qr.status === 'active' ? t('counter.visitQr.expiresIn', { time: formatCountdown(remainingSeconds) }) : null,
    refusal: qr.status !== 'active' || qr.refusal === null ? null : t('counter.visitQr.refused', { when: formatWhen(qr.refusal.availableAt, now, t) }),
    receipt: qr.claim === null ? null : { key: qr.claim.entry.id, model: toLaunchReceipt(qr.claim, rewardTitle, t) },
  }
}
