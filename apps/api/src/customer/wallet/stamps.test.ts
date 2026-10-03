import { describe, expect, it } from 'vitest'
import { deriveStamps, type EarnedEntry } from './stamps'

const entry = (kind: EarnedEntry['kind'], units: number, day: number): EarnedEntry => ({
  kind,
  units,
  occurredAt: new Date(Date.UTC(2026, 9, day, 12)),
})

describe('deriveStamps', () => {
  it('numbers the stamps from the oldest to the newest', () => {
    const stamps = deriveStamps([entry('checkIn', 1, 3), entry('visit', 1, 2), entry('visit', 1, 1)], 3)
    expect(stamps.map((s) => [s.number, s.source])).toEqual([[1, 'counter'], [2, 'counter'], [3, 'checkIn']])
    expect(stamps[0]?.earnedAt).toBe('2026-10-01T12:00:00.000Z')
  })

  it('expands a multi-unit entry into one stamp per unit (welcome bonus)', () => {
    const stamps = deriveStamps([entry('visit', 1, 2), entry('welcomeBonus', 2, 1)], 3)
    expect(stamps.map((s) => s.source)).toEqual(['welcomeBonus', 'welcomeBonus', 'counter'])
  })

  it('keeps only the latest units when earlier ones were consumed by a redemption', () => {
    const stamps = deriveStamps([entry('visit', 1, 4), entry('visit', 1, 3), entry('visit', 1, 2), entry('visit', 1, 1)], 2)
    expect(stamps.map((s) => s.earnedAt)).toEqual(['2026-10-03T12:00:00.000Z', '2026-10-04T12:00:00.000Z'])
    expect(stamps.map((s) => s.number)).toEqual([1, 2])
  })

  it('cuts a multi-unit entry in the middle when the balance ends inside it', () => {
    const stamps = deriveStamps([entry('welcomeBonus', 3, 1)], 2)
    expect(stamps).toHaveLength(2)
  })

  it('is empty for an empty card and never invents stamps the ledger does not have', () => {
    expect(deriveStamps([], 0)).toEqual([])
    expect(deriveStamps([entry('visit', 1, 1)], 5)).toHaveLength(1)
  })
})
