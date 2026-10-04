import { describe, expect, it } from 'vitest'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import type { ProgramRules } from '#shared/schemas/program'
import { toProgramRules } from './program-rules.mapper'

function rulesOf(columns: Parameters<typeof toProgramRules>[0]): ProgramRules {
  const result = toProgramRules(columns)
  if (!result.ok) throw new Error('expected valid rules')
  return result.value
}

describe('toProgramRules', () => {
  it('maps a stamp card', () => {
    const rules = rulesOf({ mode: 'stamps', earnUnits: 1, target: 10 })
    expect(rules).toEqual({ mode: 'stamps', target: 10 })
    expect(unitOf(rules)).toBe('stamp')
    expect(earnRateOf(rules)).toEqual({ per: 'visit', units: 1 })
  })

  it('maps points per visit', () => {
    const rules = rulesOf({ mode: 'pointsPerVisit', earnUnits: 10, target: 100 })
    expect(rules).toEqual({ mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 })
    expect(earnRateOf(rules)).toEqual({ per: 'visit', units: 10 })
  })

  it('maps points per currency', () => {
    const rules = rulesOf({ mode: 'pointsPerCurrency', earnUnits: 2, target: 200 })
    expect(rules).toEqual({ mode: 'pointsPerCurrency', pointsPerReal: 2, target: 200 })
    expect(earnRateOf(rules)).toEqual({ per: 'real', units: 2 })
  })

  it('refuses a row that breaks the domain limits instead of passing it on', () => {
    expect(toProgramRules({ mode: 'stamps', earnUnits: 1, target: 500 })).toEqual({ ok: false, error: { code: 'invalidProgram' } })
  })
})

import { toExpirationPolicy } from './program-rules.mapper'

describe('toExpirationPolicy', () => {
  it('maps "never" ignoring the months', () => {
    expect(toExpirationPolicy({ expirationKind: 'never', expirationMonths: null })).toEqual({ ok: true, value: { kind: 'never' } })
  })

  it('maps inactivity with its months', () => {
    expect(toExpirationPolicy({ expirationKind: 'afterInactivity', expirationMonths: 6 })).toEqual({
      ok: true,
      value: { kind: 'afterInactivity', months: 6 },
    })
  })

  it.each([null, 0, 25])('refuses inactivity with months=%s', (months) => {
    expect(toExpirationPolicy({ expirationKind: 'afterInactivity', expirationMonths: months })).toEqual({ ok: false, error: { code: 'invalidProgram' } })
  })
})
