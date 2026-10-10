import { VISIT_QR_TTL_MINUTES } from '../constants/domain'
import type { Birthday } from '../schemas/common'
import type { BonusRules, CheckInCooldown, ProgramRules } from '../schemas/program'
import type { VisitQrCancelReason, VisitQrEarn, VisitQrStatus } from '../schemas/visitQr'
import type { ErrorOf } from '../types/errors'
import { err, ok } from '../types/result'
import type { Result } from '../types/result'
import { addMinutes, toIso } from '../utils/time'
import { checkInAvailableAt } from './antifraud'
import { planEarning } from './earning'
import type { EarningCard, EarningPlan } from './earning'
import { acceptsAmount, baseUnitsFor } from './programStrategies'
import type { EarnError, EarnInput } from './programStrategies'

/** O QR da visita como está gravado, mais o que a decisão de uso precisa saber da loja agora. */
export interface VisitQrSnapshot {
  readonly status: VisitQrStatus
  readonly cancelReason: VisitQrCancelReason | null
  readonly expiresAt: Date
  readonly claimedBy: string | null
  /** Quem atestou a venda e quem é dono da loja: nenhum dos dois ganha no próprio QR (`null` = desconhecido, só no mock). */
  readonly issuedBy: string | null
  readonly shopOwnerId: string | null
  readonly programId: string
  /** Versão ativa da loja agora; `null` se a loja não tem programa ativo. */
  readonly activeProgramId: string | null
  readonly shopApproved: boolean
}

export type VisitQrUseError = ErrorOf<'invalidVisitQr' | 'visitQrExpired' | 'visitQrAlreadyUsed' | 'visitQrStale'>

export function visitQrExpiresAt(createdAt: Date): Date {
  return addMinutes(createdAt, VISIT_QR_TTL_MINUTES)
}

/** Situação para exibir: `active` com `now >= expiresAt` vira `expired`. */
export function visitQrStatusAt(snapshot: Pick<VisitQrSnapshot, 'status' | 'expiresAt'>, now: Date): VisitQrStatus {
  if (snapshot.status !== 'active') return snapshot.status
  return now >= snapshot.expiresAt ? 'expired' : 'active'
}

/**
 * RN-11, nesta ordem: loja não aprovada → invalid; emissor ou dono da loja → invalid (R12); já usado (mesma pessoa → replay, outra → alreadyUsed); cancelado
 * (programChanged → stale, merchant → invalid); vencido; versão do programa mudou → stale. "Já usado" vem antes de
 * "vencido": quem perdeu a resposta e reenvia depois da validade recebe o que já ganhou (CA-14), não `visitQrExpired`.
 */
export function decideVisitQrUse(qr: VisitQrSnapshot, customerId: string, now: Date): Result<'claim' | 'replay', VisitQrUseError> {
  if (!qr.shopApproved || qr.activeProgramId === null) return err({ code: 'invalidVisitQr' })
  // Mesma resposta de QR inexistente: não conta ao lojista que o bloqueio foi por ser ele o emissor.
  if (customerId === qr.issuedBy || customerId === qr.shopOwnerId) return err({ code: 'invalidVisitQr' })
  if (qr.status === 'claimed') {
    return qr.claimedBy === customerId ? ok('replay') : err({ code: 'visitQrAlreadyUsed' })
  }
  if (qr.status === 'cancelled') {
    return err({ code: qr.cancelReason === 'programChanged' ? 'visitQrStale' : 'invalidVisitQr' })
  }
  if (visitQrStatusAt(qr, now) === 'expired') return err({ code: 'visitQrExpired' })
  if (qr.programId !== qr.activeProgramId) return err({ code: 'visitQrStale' })
  return ok('claim')
}

/** RN-07: valor obrigatório e válido no modo por real; proibido nos modos por visita. */
export function planVisitQrIssue(rules: ProgramRules, amountCents: number | undefined): Result<VisitQrEarn, EarnError> {
  if (!acceptsAmount(rules)) {
    return amountCents === undefined ? ok({ kind: 'visit' }) : err({ code: 'amountNotAccepted' })
  }
  if (amountCents === undefined) return err({ code: 'invalidAmount' })
  const units = baseUnitsFor(rules, { kind: 'amount', amountCents })
  return units.ok ? ok({ kind: 'amount', amountCents }) : units
}

/**
 * P-04: o que o QR rende no cartão desta pessoa (que pode estar numa versão anterior do programa). Cartão por
 * visita conta 1 visita mesmo com valor (o valor fica só registrado); cartão por real sem valor não tem como render.
 */
export function resolveVisitEarnInput(cardRules: ProgramRules, earn: VisitQrEarn): Result<EarnInput, ErrorOf<'visitQrStale'>> {
  if (!acceptsAmount(cardRules)) return ok({ kind: 'visit' })
  return earn.kind === 'amount' ? ok(earn) : err({ code: 'visitQrStale' })
}

export interface VisitEarningRequest {
  /** Da versão do cartão (ou a ativa, cartão novo/zerado). */
  readonly rules: ProgramRules
  readonly bonusRules: BonusRules
  /** Da versão ativa: a política vigente da loja é a que vale com o lojista atestando a venda. */
  readonly cooldown: CheckInCooldown
  readonly card: EarningCard
  readonly birthday: Birthday | null
  readonly earn: VisitQrEarn
  readonly now: Date
}

/** RN-11 passos 4–6: modo do cartão (P-04), janela (`checkInAvailableAt`) e o que rende (`planEarning`). Sem cópia. */
export function decideVisitEarning(
  request: VisitEarningRequest,
): Result<EarningPlan, ErrorOf<'checkInCooldown' | 'visitQrStale'>> {
  const input = resolveVisitEarnInput(request.rules, request.earn)
  if (!input.ok) return input

  const availableAt = checkInAvailableAt(request.card.lastVisitAt, request.cooldown, request.now)
  if (availableAt !== null) return err({ code: 'checkInCooldown', availableAt: toIso(availableAt) })

  const plan = planEarning({
    rules: request.rules,
    bonusRules: request.bonusRules,
    customerBirthday: request.birthday,
    card: request.card,
    input: input.value,
    now: request.now,
  })
  // O valor já foi validado na emissão; se a regra do cartão não aceitar, o QR não serve para este cartão.
  return plan.ok ? plan : err({ code: 'visitQrStale' })
}
