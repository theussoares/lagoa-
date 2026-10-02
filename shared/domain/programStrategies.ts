import type { EarnRate, ProgramMode, ProgramRules, ProgramRulesByMode, ProgramUnit } from '../schemas/program'
import { AMOUNT_MAX_CENTS, REFERENCE_TICKET_REAIS } from '../constants/domain'
import { err, ok } from '../types/result'
import type { Result } from '../types/result'
import type { ErrorOf } from '../types/errors'

export type EarnInput = { readonly kind: 'visit' } | { readonly kind: 'amount'; readonly amountCents: number }

export type EarnError = ErrorOf<'invalidAmount' | 'amountNotAccepted'>

/** Estratégia de um modo de programa: como uma visita vira carimbos ou pontos. */
export interface ProgramStrategy<R> {
  readonly unit: ProgramUnit
  readonly acceptsAmount: boolean
  baseUnits(rules: R, input: EarnInput): Result<number, EarnError>
  earnRate(rules: R): EarnRate
  /** Quanto uma visita típica rende; base para converter metas e dimensionar presentes. */
  visitWorth(rules: R): number
}

const CENTS_PER_REAL = 100

function validAmount(amountCents: number): boolean {
  return Number.isInteger(amountCents) && amountCents > 0 && amountCents <= AMOUNT_MAX_CENTS
}

const programStrategies: { readonly [M in ProgramMode]: ProgramStrategy<ProgramRulesByMode[M]> } = {
  stamps: {
    unit: 'stamp',
    acceptsAmount: false,
    baseUnits: (_rules, input) => (input.kind === 'visit' ? ok(1) : err({ code: 'amountNotAccepted' })),
    earnRate: () => ({ per: 'visit', units: 1 }),
    visitWorth: () => 1,
  },
  pointsPerVisit: {
    unit: 'point',
    acceptsAmount: false,
    baseUnits: (rules, input) =>
      input.kind === 'visit' ? ok(rules.pointsPerVisit) : err({ code: 'amountNotAccepted' }),
    earnRate: (rules) => ({ per: 'visit', units: rules.pointsPerVisit }),
    visitWorth: (rules) => rules.pointsPerVisit,
  },
  pointsPerCurrency: {
    unit: 'point',
    acceptsAmount: true,
    baseUnits: (rules, input) => {
      if (input.kind !== 'amount') return err({ code: 'amountNotAccepted' })
      if (!validAmount(input.amountCents)) return err({ code: 'invalidAmount' })
      const points = Math.floor((input.amountCents / CENTS_PER_REAL) * rules.pointsPerReal)
      return points > 0 ? ok(points) : err({ code: 'invalidAmount' })
    },
    earnRate: (rules) => ({ per: 'real', units: rules.pointsPerReal }),
    visitWorth: (rules) => rules.pointsPerReal * REFERENCE_TICKET_REAIS,
  },
}

export function strategyFor<M extends ProgramMode>(rules: ProgramRulesByMode[M] & { mode: M }): ProgramStrategy<ProgramRulesByMode[M]> {
  return programStrategies[rules.mode]
}

export function unitOf(rules: ProgramRules): ProgramUnit {
  return programStrategies[rules.mode].unit
}

export function acceptsAmount(rules: ProgramRules): boolean {
  return programStrategies[rules.mode].acceptsAmount
}

// O switch só existe porque o TS não correlaciona `rules.mode` com o mapa de
// estratégias numa união; a regra de cada modo continua no mapa acima.
export function baseUnitsFor(rules: ProgramRules, input: EarnInput): Result<number, EarnError> {
  switch (rules.mode) {
    case 'stamps':
      return strategyFor(rules).baseUnits(rules, input)
    case 'pointsPerVisit':
      return strategyFor(rules).baseUnits(rules, input)
    case 'pointsPerCurrency':
      return strategyFor(rules).baseUnits(rules, input)
  }
}

export function earnRateOf(rules: ProgramRules): EarnRate {
  switch (rules.mode) {
    case 'stamps':
      return strategyFor(rules).earnRate(rules)
    case 'pointsPerVisit':
      return strategyFor(rules).earnRate(rules)
    case 'pointsPerCurrency':
      return strategyFor(rules).earnRate(rules)
  }
}

export function visitWorthOf(rules: ProgramRules): number {
  switch (rules.mode) {
    case 'stamps':
      return strategyFor(rules).visitWorth(rules)
    case 'pointsPerVisit':
      return strategyFor(rules).visitWorth(rules)
    case 'pointsPerCurrency':
      return strategyFor(rules).visitWorth(rules)
  }
}
