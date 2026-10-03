import { describe, expect, it } from 'vitest'
import { earnRateOf, unitOf } from '#shared/domain/programStrategies'
import { toProgramRules } from './program-rules.mapper'

describe('toProgramRules', () => {
  it('maps a stamp card', () => {
    const rules = toProgramRules({ mode: 'stamps', earnUnits: 1, target: 10 })
    expect(rules).toEqual({ mode: 'stamps', target: 10 })
    expect(unitOf(rules)).toBe('stamp')
    expect(earnRateOf(rules)).toEqual({ per: 'visit', units: 1 })
  })

  it('maps points per visit', () => {
    const rules = toProgramRules({ mode: 'pointsPerVisit', earnUnits: 10, target: 100 })
    expect(rules).toEqual({ mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 })
    expect(earnRateOf(rules)).toEqual({ per: 'visit', units: 10 })
  })

  it('maps points per currency', () => {
    const rules = toProgramRules({ mode: 'pointsPerCurrency', earnUnits: 2, target: 200 })
    expect(rules).toEqual({ mode: 'pointsPerCurrency', pointsPerReal: 2, target: 200 })
    expect(earnRateOf(rules)).toEqual({ per: 'real', units: 2 })
  })

  it('refuses a row that breaks the domain limits instead of passing it on', () => {
    expect(() => toProgramRules({ mode: 'stamps', earnUnits: 1, target: 500 })).toThrow()
  })
})
