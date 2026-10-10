import { describe, expect, it } from 'vitest'
import { checkInAvailableAt, cooldownEndsAt } from './antifraud'

const now = new Date('2026-10-03T12:00:00Z')
const hours = (cooldownHours: number) => ({ cooldownHours, cooldownMode: 'rolling' as const })
const calendarDay = { cooldownHours: 24, cooldownMode: 'calendarDay' as const }

describe('checkInAvailableAt', () => {
  it('is free when there was no visit yet', () => {
    expect(checkInAvailableAt(null, hours(24), now)).toBeNull()
  })

  it('holds until the window ends and says when', () => {
    expect(checkInAvailableAt(new Date('2026-10-03T10:00:00Z'), hours(4), now)?.toISOString()).toBe('2026-10-03T14:00:00.000Z')
  })

  it('is free exactly when the window ends', () => {
    expect(checkInAvailableAt(new Date('2026-10-03T08:00:00Z'), hours(4), now)).toBeNull()
  })

  it('is always free with a zero window', () => {
    expect(checkInAvailableAt(now, hours(0), now)).toBeNull()
  })
})

describe('calendarDay cooldown (one visit per local day, resets at midnight)', () => {
  // Três Lagoas é UTC−4: 23h local = 03:00Z do dia seguinte; meia-noite local = 04:00Z.
  const at23hLocal = new Date('2026-10-04T03:00:00Z')

  it('frees the next visit at the next local midnight', () => {
    expect(cooldownEndsAt(at23hLocal, calendarDay).toISOString()).toBe('2026-10-04T04:00:00.000Z')
  })

  it('counts 23h and 3h of the next day as two visits', () => {
    const at3hNextDay = new Date('2026-10-04T07:00:00Z')
    expect(checkInAvailableAt(at23hLocal, calendarDay, at3hNextDay)).toBeNull()
  })

  it('holds a second visit on the same local day until midnight', () => {
    const morning = new Date('2026-10-03T12:00:00Z') // 8h local
    const evening = new Date('2026-10-03T23:00:00Z') // 19h local
    expect(checkInAvailableAt(morning, calendarDay, evening)?.toISOString()).toBe('2026-10-04T04:00:00.000Z')
  })

  it('ignores the stored hours', () => {
    expect(cooldownEndsAt(at23hLocal, { cooldownHours: 168, cooldownMode: 'calendarDay' }).toISOString()).toBe('2026-10-04T04:00:00.000Z')
  })
})
