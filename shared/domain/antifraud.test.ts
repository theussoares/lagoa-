import { describe, expect, it } from 'vitest'
import { checkInAvailableAt } from './antifraud'

const now = new Date('2026-10-03T12:00:00Z')

describe('checkInAvailableAt', () => {
  it('is free when there was no visit yet', () => {
    expect(checkInAvailableAt(null, 24, now)).toBeNull()
  })

  it('holds until the window ends and says when', () => {
    expect(checkInAvailableAt(new Date('2026-10-03T10:00:00Z'), 4, now)?.toISOString()).toBe('2026-10-03T14:00:00.000Z')
  })

  it('is free exactly when the window ends', () => {
    expect(checkInAvailableAt(new Date('2026-10-03T08:00:00Z'), 4, now)).toBeNull()
  })

  it('is always free with a zero window', () => {
    expect(checkInAvailableAt(now, 0, now)).toBeNull()
  })
})
