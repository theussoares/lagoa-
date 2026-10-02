import { describe, expect, it } from 'vitest'
import type { BonusRules } from '../schemas/program'
import { applyVisitBonuses, welcomeUnits } from './bonusRules'

const rules: BonusRules = {
  welcomeBonus: { enabled: true, units: 2 },
  birthdayMultiplier: { enabled: true, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: true, multiplier: 2, date: '2026-10-01' },
}
const today = { isoDate: '2026-10-01', monthDay: '10-01' }

describe('applyVisitBonuses', () => {
  it('doubles on the customer birthday', () => {
    const result = applyVisitBonuses(1, { ...rules, surpriseDay: { ...rules.surpriseDay, enabled: false } }, {
      today,
      customerBirthday: '10-01',
    })
    expect(result).toEqual({ units: 2, applied: ['birthdayMultiplier'] })
  })

  it('does not stack birthday and surprise day', () => {
    expect(applyVisitBonuses(1, rules, { today, customerBirthday: '10-01' }).units).toBe(2)
  })

  it('keeps base units on an ordinary day', () => {
    expect(applyVisitBonuses(3, rules, { today: { isoDate: '2026-10-02', monthDay: '10-02' }, customerBirthday: null })).toEqual({
      units: 3,
      applied: [],
    })
  })
})

describe('welcomeUnits', () => {
  it('is zero when the welcome rule is off', () => {
    expect(welcomeUnits({ ...rules, welcomeBonus: { enabled: false, units: 2 } })).toBe(0)
    expect(welcomeUnits(rules)).toBe(2)
  })
})
