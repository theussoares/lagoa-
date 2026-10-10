import { describe, expect, it } from 'vitest'
import { startOfLocalDay } from './time'

describe('startOfLocalDay', () => {
  it('is local midnight (UTC-4) of the day of the instant, in UTC', () => {
    expect(startOfLocalDay(new Date('2026-10-09T15:30:00Z')).toISOString()).toBe('2026-10-09T04:00:00.000Z')
  })

  it('does not flip to the next day when UTC already passed midnight but the city has not', () => {
    // 22:30 local de 9/10 já é 02:30 UTC de 10/10: o dia da loja ainda é 9/10.
    expect(startOfLocalDay(new Date('2026-10-10T02:30:00Z')).toISOString()).toBe('2026-10-09T04:00:00.000Z')
  })

  it('moves to the new day exactly at local midnight', () => {
    expect(startOfLocalDay(new Date('2026-10-10T03:59:59.999Z')).toISOString()).toBe('2026-10-09T04:00:00.000Z')
    expect(startOfLocalDay(new Date('2026-10-10T04:00:00Z')).toISOString()).toBe('2026-10-10T04:00:00.000Z')
  })
})
