import { describe, expect, it } from 'vitest'
import { isLapsedSince, isReachableForReminder, lapsedCutoff } from './customer'

describe('isReachableForReminder', () => {
  it('only reaches lapsed customers who accepted notifications', () => {
    expect(isReachableForReminder({ isLapsed: true, acceptsNotifications: true })).toBe(true)
    expect(isReachableForReminder({ isLapsed: true, acceptsNotifications: false })).toBe(false)
    expect(isReachableForReminder({ isLapsed: false, acceptsNotifications: true })).toBe(false)
  })
})

describe('isLapsedSince', () => {
  const now = new Date('2026-10-10T12:00:00.000Z')

  it('is lapsed only after more than 30 full days without a visit', () => {
    expect(isLapsedSince('2026-09-09T12:00:00.000Z', now)).toBe(true)
    expect(isLapsedSince('2026-09-09T12:00:00.001Z', now)).toBe(false)
    expect(isLapsedSince('2026-09-10T00:00:00.000Z', now)).toBe(false)
  })

  it('never counts a card without visits as lapsed', () => {
    expect(isLapsedSince(null, now)).toBe(false)
  })

  it('shares the cutoff the API filters by in SQL', () => {
    expect(lapsedCutoff(now).toISOString()).toBe('2026-09-09T12:00:00.000Z')
  })
})
