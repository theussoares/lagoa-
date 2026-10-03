import { describe, expect, it } from 'vitest'
import { birthdayChangeableAt } from './birthday'

const now = new Date('2026-10-03T12:00:00Z')

describe('birthdayChangeableAt', () => {
  it('is free when the date was never changed', () => {
    expect(birthdayChangeableAt(null, now)).toBeNull()
  })

  it('locks for 365 days after a change', () => {
    const changedAt = new Date('2026-06-01T12:00:00Z')
    expect(birthdayChangeableAt(changedAt, now)?.toISOString()).toBe('2027-06-01T12:00:00.000Z')
  })

  it('unlocks once the cooldown has passed', () => {
    expect(birthdayChangeableAt(new Date('2025-10-03T12:00:00Z'), now)).toBeNull()
  })
})
