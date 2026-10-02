import { unitOf } from '#shared/domain/programStrategies'
import type { ProgramRules, ProgramUnit } from '#shared/schemas/program'

/** O que o botão principal do Balcão faz, conforme o modo do clube. */
export type CounterAction =
  | { readonly kind: 'visit'; readonly unit: ProgramUnit; readonly units: number }
  | { readonly kind: 'amount'; readonly pointsPerReal: number }

export function counterActionFor(rules: ProgramRules): CounterAction {
  if (rules.mode === 'pointsPerCurrency') return { kind: 'amount', pointsPerReal: rules.pointsPerReal }
  return { kind: 'visit', unit: unitOf(rules), units: rules.mode === 'pointsPerVisit' ? rules.pointsPerVisit : 1 }
}

const AMOUNT_DIGITS_MAX = 7

/** Valor digitado como no caixa: os dígitos entram pelos centavos ("2490" → R$ 24,90). */
export function amountDigits(input: string): string {
  return input.replace(/\D/g, '').replace(/^0+/, '').slice(0, AMOUNT_DIGITS_MAX)
}
