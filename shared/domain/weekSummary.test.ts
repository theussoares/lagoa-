import { describe, expect, it } from 'vitest'
import { CustomerIdSchema } from '../schemas/ids'
import type { LedgerKind } from '../schemas/visit'
import { summarizeWeek } from './weekSummary'
import type { WeekLedgerRecord } from './weekSummary'

// 12:00 em Três Lagoas (UTC−4).
const now = new Date('2026-10-02T16:00:00Z')
const ana = CustomerIdSchema.parse('cus_ana')
const joao = CustomerIdSchema.parse('cus_joao')

function record(createdAt: string, kind: LedgerKind = 'visit', overrides: Partial<WeekLedgerRecord> = {}): WeekLedgerRecord {
  return { customerId: ana, kind, createdAt, ...overrides }
}

describe('summarizeWeek', () => {
  it('returns seven local days ending today, even with no activity', () => {
    const week = summarizeWeek([], now)
    expect(week.days.map((day) => day.isoDate)).toEqual([
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ])
    expect(week).toMatchObject({ visits: 0, customers: 0, newCustomers: 0, redemptions: 0 })
  })

  it('counts visits, distinct customers, new customers and redemptions', () => {
    const week = summarizeWeek(
      [
        record('2026-08-01T13:00:00Z'),
        record('2026-10-02T13:00:00Z'),
        record('2026-10-01T13:00:00Z'),
        record('2026-10-02T14:00:00Z', 'checkIn', { customerId: joao }),
        record('2026-10-02T15:00:00Z', 'redemption'),
      ],
      now,
    )
    expect(week).toMatchObject({ visits: 3, customers: 2, newCustomers: 1, redemptions: 1 })
    expect(week.days.at(-1)).toEqual({ isoDate: '2026-10-02', visits: 2, newCustomers: 1, redemptions: 1 })
  })

  it('counts a customer as new on the day of the first visit to this shop, whatever the channel', () => {
    const week = summarizeWeek(
      [
        record('2026-09-30T13:00:00Z', 'checkIn', { customerId: joao }),
        record('2026-10-02T13:00:00Z', 'visit', { customerId: joao }),
        record('2026-10-02T14:00:00Z', 'visit', { customerId: joao }),
      ],
      now,
    )
    expect(week.newCustomers).toBe(1)
    expect(week.days.map((day) => day.newCustomers)).toEqual([0, 0, 0, 0, 1, 0, 0])
  })

  it('does not count campaign gifts as visits', () => {
    expect(summarizeWeek([record('2026-10-02T13:00:00Z', 'campaignBonus')], now)).toMatchObject({ visits: 0, customers: 0 })
  })

  it('uses the pilot time zone and leaves out older records', () => {
    // 01:00 UTC do dia 26 ainda é dia 25 na cidade: fora da semana.
    const week = summarizeWeek([record('2026-09-26T01:00:00Z'), record('2026-09-26T05:00:00Z')], now)
    expect(week.visits).toBe(1)
    expect(week.days[0]?.visits).toBe(1)
  })
})
