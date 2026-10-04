import { describe, expect, it } from 'vitest'
import type { BonusRules, ProgramRules } from '../schemas/program'
import { planEarning } from './earning'
import type { EarningRequest } from './earning'

const NO_BONUS: BonusRules = {
  welcomeBonus: { enabled: false, units: 1 },
  birthdayMultiplier: { enabled: false, multiplier: 2 },
  referralBonus: { enabled: false, units: 1 },
  surpriseDay: { enabled: false, multiplier: 2, date: null },
}
const STAMPS: ProgramRules = { mode: 'stamps', target: 10 }
// 2026-10-03 12:00 UTC = 08:00 em Três Lagoas (mesmo dia no fuso do piloto)
const now = new Date('2026-10-03T12:00:00Z')

function request(overrides: Partial<EarningRequest> = {}): EarningRequest {
  return {
    rules: STAMPS,
    bonusRules: NO_BONUS,
    customerBirthday: null,
    card: { balance: 3, rewardExpiresAt: null, lastVisitAt: new Date('2026-09-01T12:00:00Z') },
    input: { kind: 'visit' },
    now,
    ...overrides,
  }
}

function plan(overrides: Partial<EarningRequest> = {}) {
  const result = planEarning(request(overrides))
  if (!result.ok) throw new Error(`expected a plan, got ${result.error.code}`)
  return result.value
}

describe('planEarning', () => {
  it('adds the visit units to an existing card', () => {
    expect(plan()).toMatchObject({ welcomeUnits: 0, units: 1, balanceAfter: 4, rewardExpiresAt: null })
  })

  it('gives the welcome units only to a brand new card', () => {
    const welcome = { ...NO_BONUS, welcomeBonus: { enabled: true, units: 2 } }
    expect(plan({ card: null, bonusRules: welcome })).toMatchObject({ welcomeUnits: 2, units: 1, balanceAfter: 3 })
    expect(plan({ bonusRules: welcome })).toMatchObject({ welcomeUnits: 0, balanceAfter: 4 })
  })

  it('doubles on the customer birthday and does not stack with the surprise day', () => {
    const rules: BonusRules = {
      ...NO_BONUS,
      birthdayMultiplier: { enabled: true, multiplier: 2 },
      surpriseDay: { enabled: true, multiplier: 2, date: '2026-10-03' },
    }
    expect(plan({ bonusRules: rules, customerBirthday: '10-03' }).units).toBe(2)
  })

  it('uses the pilot time zone to decide which day it is', () => {
    const rules: BonusRules = { ...NO_BONUS, surpriseDay: { enabled: true, multiplier: 2, date: '2026-10-02' } }
    // 02:00 UTC de 03/10 ainda é 22:00 de 02/10 em Três Lagoas
    expect(plan({ bonusRules: rules, now: new Date('2026-10-03T02:00:00Z') }).units).toBe(2)
  })

  it('holds the reward for 30 days when the card reaches the target', () => {
    const result = plan({ card: { balance: 9, rewardExpiresAt: null, lastVisitAt: new Date('2026-09-01T12:00:00Z') } })
    expect(result.balanceAfter).toBe(10)
    expect(result.rewardExpiresAt?.toISOString()).toBe('2026-11-02T12:00:00.000Z')
  })

  it('keeps the original hold date when more units arrive on a card that is already ready', () => {
    const held = new Date('2026-10-20T00:00:00Z')
    expect(plan({ card: { balance: 10, rewardExpiresAt: held, lastVisitAt: new Date('2026-09-01T12:00:00Z') } }).rewardExpiresAt).toEqual(held)
  })

  it('gives the welcome units on the first visit even when the card already exists (born from a referral bonus)', () => {
    const welcome = { ...NO_BONUS, welcomeBonus: { enabled: true, units: 2 } }
    const result = plan({ card: { balance: 2, rewardExpiresAt: null, lastVisitAt: null }, bonusRules: welcome })
    expect(result).toMatchObject({ welcomeUnits: 2, units: 1, balanceAfter: 5 })
  })

  it('counts the welcome units toward the target', () => {
    const welcome = { ...NO_BONUS, welcomeBonus: { enabled: true, units: 2 } }
    const result = plan({ card: null, bonusRules: welcome, rules: { mode: 'stamps', target: 3 } })
    expect(result.balanceAfter).toBe(3)
    expect(result.rewardExpiresAt).not.toBeNull()
  })

  it('refuses an amount-based club when no amount was given', () => {
    const result = planEarning(request({ rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 200 } }))
    expect(result).toEqual({ ok: false, error: { code: 'amountNotAccepted' } })
  })

  it('earns the fixed points of a points-per-visit club', () => {
    expect(plan({ rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 } }).units).toBe(10)
  })
})
