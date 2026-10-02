import { describe, expect, it } from 'vitest'
import { acceptsAmount, baseUnitsFor, earnRateOf, unitOf } from './programStrategies'

describe('program strategies', () => {
  it('stamps give one stamp per visit and refuse amounts', () => {
    const rules = { mode: 'stamps', target: 10 } as const
    expect(unitOf(rules)).toBe('stamp')
    expect(baseUnitsFor(rules, { kind: 'visit' })).toEqual({ ok: true, value: 1 })
    expect(baseUnitsFor(rules, { kind: 'amount', amountCents: 5000 })).toEqual({
      ok: false,
      error: { code: 'amountNotAccepted' },
    })
  })

  it('points per visit give the configured points', () => {
    const rules = { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 } as const
    expect(unitOf(rules)).toBe('point')
    expect(baseUnitsFor(rules, { kind: 'visit' })).toEqual({ ok: true, value: 10 })
  })

  it('points per currency floor the amount and only accept amounts', () => {
    const rules = { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 150 } as const
    expect(acceptsAmount(rules)).toBe(true)
    expect(baseUnitsFor(rules, { kind: 'amount', amountCents: 3299 })).toEqual({ ok: true, value: 65 })
    expect(baseUnitsFor(rules, { kind: 'visit' }).ok).toBe(false)
    expect(baseUnitsFor(rules, { kind: 'amount', amountCents: 0 })).toEqual({
      ok: false,
      error: { code: 'invalidAmount' },
    })
  })
})

describe('earnRateOf', () => {
  it('says how each mode earns', () => {
    expect(earnRateOf({ mode: 'stamps', target: 10 })).toEqual({ per: 'visit', units: 1 })
    expect(earnRateOf({ mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 })).toEqual({ per: 'visit', units: 10 })
    expect(earnRateOf({ mode: 'pointsPerCurrency', pointsPerReal: 2, target: 150 })).toEqual({ per: 'real', units: 2 })
  })
})
