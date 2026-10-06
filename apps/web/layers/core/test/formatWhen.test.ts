import { describe, expect, it } from 'vitest'
import { formatWhen } from '../app/utils/formatWhen'

const now = new Date('2026-10-02T15:00:00Z')
const t = (key: string, named: Record<string, unknown> = {}): string =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`)].join(' ')

describe('formatWhen', () => {
  it.each([
    ['2026-10-02T22:40:00Z', 'checkIn.when.today time=18:40'],
    ['2026-10-03T13:00:00Z', 'checkIn.when.tomorrow time=09:00'],
    ['2026-10-05T13:00:00Z', 'checkIn.when.later date=5 de out. time=09:00'],
  ])('describes %s in the city time zone', (iso, expected) => {
    expect(formatWhen(iso, now, t)).toBe(expected)
  })

  it('treats 23h local as today even when UTC already turned the day', () => {
    expect(formatWhen('2026-10-03T03:00:00Z', now, t)).toBe('checkIn.when.today time=23:00')
  })
})
