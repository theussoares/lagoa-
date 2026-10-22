import { describe, expect, it } from 'vitest'
import type { BonusRules, ProgramRules } from '../schemas/program'
import { isSurpriseDayToday, showcaseEarning } from './showcaseEarning'

const NO_BONUS: BonusRules = {
  welcomeBonus: { enabled: false, units: 1 },
  birthdayMultiplier: { enabled: false, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: false, multiplier: 2, date: null },
}
const surpriseOn = (date: string): BonusRules => ({ ...NO_BONUS, surpriseDay: { enabled: true, multiplier: 2, date } })

const STAMPS: ProgramRules = { mode: 'stamps', target: 10 }
const PER_REAL: ProgramRules = { mode: 'pointsPerCurrency', pointsPerReal: 10, target: 500 }
const PER_VISIT: ProgramRules = { mode: 'pointsPerVisit', pointsPerVisit: 5, target: 50 }
// 2026-10-21T02:00Z is 22h of 2026-10-20 in the pilot time zone.
const NOW = new Date('2026-10-21T02:00:00Z')

describe('showcaseEarning', () => {
  it('stamp card earns one stamp per visit, no price needed', () => {
    expect(showcaseEarning({ rules: STAMPS, bonusRules: NO_BONUS, priceCents: null, now: NOW })).toEqual({
      unit: 'stamp',
      units: 1,
      doubled: false,
    })
  })

  it('points per visit ignore the price', () => {
    expect(showcaseEarning({ rules: PER_VISIT, bonusRules: NO_BONUS, priceCents: 5990, now: NOW })).toEqual({
      unit: 'point',
      units: 5,
      doubled: false,
    })
  })

  it('points per real convert the price with the real rounding', () => {
    expect(showcaseEarning({ rules: PER_REAL, bonusRules: NO_BONUS, priceCents: 5990, now: NOW })).toEqual({
      unit: 'point',
      units: 599,
      doubled: false,
    })
  })

  it('is null when the mode is per real and the item has no price', () => {
    expect(showcaseEarning({ rules: PER_REAL, bonusRules: NO_BONUS, priceCents: null, now: NOW })).toBeNull()
  })

  it('is null when planEarning refuses the amount', () => {
    expect(showcaseEarning({ rules: PER_REAL, bonusRules: NO_BONUS, priceCents: 1, now: NOW })).toBeNull()
  })

  it('doubles on the surprise day', () => {
    expect(showcaseEarning({ rules: STAMPS, bonusRules: surpriseOn('2026-10-20'), priceCents: null, now: NOW })).toEqual({
      unit: 'stamp',
      units: 2,
      doubled: true,
    })
  })

  it('does not double on another day', () => {
    expect(showcaseEarning({ rules: STAMPS, bonusRules: surpriseOn('2026-10-21'), priceCents: null, now: NOW })?.doubled).toBe(false)
  })

  it('never counts the birthday or the welcome bonus', () => {
    const rules: BonusRules = {
      ...NO_BONUS,
      welcomeBonus: { enabled: true, units: 2 },
      birthdayMultiplier: { enabled: true, multiplier: 2 },
    }
    expect(showcaseEarning({ rules: STAMPS, bonusRules: rules, priceCents: null, now: NOW })).toEqual({
      unit: 'stamp',
      units: 1,
      doubled: false,
    })
  })
})

describe('isSurpriseDayToday', () => {
  it('uses the local date: 22h of the 20th still is the 20th', () => {
    expect(isSurpriseDayToday(surpriseOn('2026-10-20'), NOW)).toBe(true)
    expect(isSurpriseDayToday(surpriseOn('2026-10-21'), NOW)).toBe(false)
  })

  it('is false when the rule is off, even with the date set', () => {
    const off: BonusRules = { ...NO_BONUS, surpriseDay: { enabled: false, multiplier: 2, date: '2026-10-20' } }
    expect(isSurpriseDayToday(off, NOW)).toBe(false)
  })
})
