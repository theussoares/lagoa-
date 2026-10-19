import { describe, expect, it } from 'vitest'
import { getComparisonRanges, summarizeComparison } from './homeComparison'
import { CustomerIdSchema } from '../schemas/ids'

describe('homeComparison', () => {
  const now = new Date('2026-10-19T14:30:00Z') // Outubro 19, 10:30 UTC-4

  it('calculates ranges properly for week, month, last30', () => {
    const ranges = getComparisonRanges(now)

    expect(ranges.week.current.end).toEqual(now)
    expect(ranges.month.current.end).toEqual(now)
    expect(ranges.last30.current.end).toEqual(now)

    // Semana: 7 dias
    expect(ranges.week.current.start.toISOString().slice(0, 10)).toBe('2026-10-13')
    expect(ranges.week.previous.start.toISOString().slice(0, 10)).toBe('2026-10-06')

    // Mês: Outubro 1 vs Setembro 1
    expect(ranges.month.current.start.toISOString().slice(0, 10)).toBe('2026-10-01')
    expect(ranges.month.previous.start.toISOString().slice(0, 10)).toBe('2026-09-01')
  })

  it('summarizes comparison counts accurately', () => {
    const cus1 = CustomerIdSchema.parse('cus_1')
    const cus2 = CustomerIdSchema.parse('cus_2')

    const newCustomers = [
      { customerId: cus1, createdAt: '2026-10-15T12:00:00Z' }, // esta semana, este mês, últimos 30
      { customerId: cus2, createdAt: '2026-10-08T12:00:00Z' }, // semana anterior, este mês, últimos 30
    ]

    const records = [
      // Visita com compra nesta semana
      { kind: 'visit' as const, createdAt: '2026-10-18T10:00:00Z', amountCents: 4500 },
      // Visita simples nesta semana
      { kind: 'checkIn' as const, createdAt: '2026-10-17T15:00:00Z', amountCents: null },
      // Resgate nesta semana
      { kind: 'redemption' as const, createdAt: '2026-10-16T11:00:00Z', amountCents: null },
      // Visita na semana anterior
      { kind: 'visit' as const, createdAt: '2026-10-08T10:00:00Z', amountCents: 3000 },
    ]

    const result = summarizeComparison(records, newCustomers, now)

    expect(result.week.visits.current).toBe(2)
    expect(result.week.visits.previous).toBe(1)
    expect(result.week.purchases.current).toBe(1)
    expect(result.week.purchases.previous).toBe(1)
    expect(result.week.redemptions.current).toBe(1)
    expect(result.week.redemptions.previous).toBe(0)
    expect(result.week.newCustomers.current).toBe(1)
    expect(result.week.newCustomers.previous).toBe(1)
  })
})
