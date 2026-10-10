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

import { toProgram, type ProgramDatabaseColumns } from './program-rules.mapper'

describe('toProgram', () => {
  const validColumns: ProgramDatabaseColumns = {
    id: '018f98a2-7b2a-7182-9f33-6d004bbbb111',
    shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb222',
    rewardTitle: 'Açaí 500ml',
    mode: 'stamps',
    earnUnits: 1,
    target: 10,
    bonusRules: {
      welcomeBonus: { enabled: true, units: 1 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: true, units: 2 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationKind: 'never',
    expirationMonths: null,
    checkInEnabled: true,
    checkInCooldownHours: 24,
    checkInCooldownMode: 'rolling',
  }

  it('maps valid database columns to a complete Program', () => {
    const result = toProgram(validColumns)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({
      id: validColumns.id,
      shopId: validColumns.shopId,
      reward: { title: 'Açaí 500ml' },
      rules: { mode: 'stamps', target: 10 },
      bonusRules: validColumns.bonusRules,
      expirationPolicy: { kind: 'never' },
      checkIn: { enabled: true, cooldownHours: 24, cooldownMode: 'rolling' },
    })
  })

  it('fails with invalidProgram if rules are invalid', () => {
    const result = toProgram({ ...validColumns, target: 9999 })
    expect(result).toEqual({ ok: false, error: { code: 'invalidProgram' } })
  })

  it('fails with invalidProgram if expiration policy is invalid', () => {
    const result = toProgram({ ...validColumns, expirationKind: 'afterInactivity', expirationMonths: null })
    expect(result).toEqual({ ok: false, error: { code: 'invalidProgram' } })
  })
})

