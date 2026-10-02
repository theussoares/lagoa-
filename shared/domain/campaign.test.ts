import { describe, expect, it } from 'vitest'
import { addDays, toIso } from '../utils/time'
import { isBonusWithinLimits, reminderBonusLimits, reminderEligibility, summarizeReach } from './campaign'
import type { ReminderCandidate } from './campaign'

const now = new Date('2026-10-02T12:00:00Z')
const daysAgo = (days: number): string => toIso(addDays(now, -days))

function candidate(overrides: Partial<ReminderCandidate>): ReminderCandidate {
  return { lastVisitAt: daysAgo(45), acceptsNotifications: true, lastRemindedAt: null, isExpired: false, ...overrides }
}

describe('reminderEligibility', () => {
  it('reaches lapsed customers who accepted notifications', () => {
    expect(reminderEligibility(candidate({}), now)).toBe('reachable')
  })

  it('skips customers who came back within the lapse window or never visited', () => {
    expect(reminderEligibility(candidate({ lastVisitAt: daysAgo(30) }), now)).toBe('notLapsed')
    expect(reminderEligibility(candidate({ lastVisitAt: null }), now)).toBe('notLapsed')
  })

  it('never reaches customers without notification consent', () => {
    expect(reminderEligibility(candidate({ acceptsNotifications: false }), now)).toBe('withoutConsent')
  })

  it('skips cards already wiped by inactivity, where a gift would be wiped again', () => {
    expect(reminderEligibility(candidate({ isExpired: true }), now)).toBe('expired')
  })

  it('reminds once per lapse: again only after the customer visits and lapses again', () => {
    expect(reminderEligibility(candidate({ lastRemindedAt: daysAgo(5) }), now)).toBe('alreadyReminded')
    expect(reminderEligibility(candidate({ lastVisitAt: daysAgo(45), lastRemindedAt: daysAgo(60) }), now)).toBe('reachable')
  })
})

describe('summarizeReach', () => {
  it('counts lapsed customers by why they are or are not reached', () => {
    expect(summarizeReach(['reachable', 'reachable', 'withoutConsent', 'expired', 'alreadyReminded', 'notLapsed'])).toEqual({
      lapsed: 5,
      withoutConsent: 1,
      expired: 1,
      alreadyReminded: 1,
      reachable: 2,
    })
  })
})

describe('reminderBonusLimits', () => {
  it('suggests one visit worth of units in every mode', () => {
    expect(reminderBonusLimits({ mode: 'stamps', target: 10 })).toEqual({ min: 0, max: 9, suggested: 1 })
    expect(reminderBonusLimits({ mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 })).toEqual({ min: 0, max: 99, suggested: 10 })
    expect(reminderBonusLimits({ mode: 'pointsPerCurrency', pointsPerReal: 1, target: 150 })).toEqual({ min: 0, max: 149, suggested: 20 })
  })

  it('never lets the gift alone reach the target', () => {
    const limits = reminderBonusLimits({ mode: 'stamps', target: 6 })
    expect(limits.max).toBe(5)
    expect(isBonusWithinLimits(6, limits)).toBe(false)
    expect(isBonusWithinLimits(5, limits)).toBe(true)
    expect(isBonusWithinLimits(1.5, limits)).toBe(false)
  })
})
