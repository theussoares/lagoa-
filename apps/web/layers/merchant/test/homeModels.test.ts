import { describe, expect, it } from 'vitest'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { Translate } from '#layers/core/app/types/i18n'
import { customerFilterFromSlug, customerFilterSlug } from '../app/utils/customerFilterQuery'
import { toHomeStatCards } from '../app/utils/homeModels'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

function week(overrides: Partial<WeekSummary> = {}): WeekSummary {
  const days = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'].map((isoDate) => ({
    isoDate,
    visits: 0,
    newCustomers: 0,
    redemptions: 0,
    amountCents: 0,
  }))
  return { days, visits: 0, customers: 0, newCustomers: 0, redemptions: 0, amountCents: 0, ...overrides }
}

describe('toHomeStatCards', () => {
  it('shows sales, visits, rewards and lapsed customers in that order', () => {
    const cards = toHomeStatCards({ week: week({ visits: 3, customers: 2, newCustomers: 1, redemptions: 1, amountCents: 12_050 }), lapsedTotal: 5, reachable: 2 }, t)
    expect(cards.map((card) => card.id)).toEqual(['sales', 'visits', 'redemptions', 'lapsed'])
    expect(cards.map((card) => card.value)).toEqual([expect.stringMatching(/120,50/), '3', '1', '5'])
  })

  it('puts the unique customers under sales and new customers under visits', () => {
    const [sales, visits] = toHomeStatCards({ week: week({ visits: 3, customers: 2, newCustomers: 1 }), lapsedTotal: 0, reachable: null }, t)
    expect(sales?.note).toBe('home.week.customers count=2 #2')
    expect(visits?.note).toBe('home.week.newCustomers count=1 #1')
  })

  it('tells how many lapsed customers can get a reminder now', () => {
    const [, , , lapsed] = toHomeStatCards({ week: week(), lapsedTotal: 5, reachable: 2 }, t)
    expect(lapsed?.note).toBe('home.lapsed.reachable count=2 #2')
  })

  it('keeps every card with zeros on an empty week, and drops the reachable note when the count did not come', () => {
    const cards = toHomeStatCards({ week: week(), lapsedTotal: 0, reachable: null }, t)
    expect(cards.map((card) => card.value)).toEqual([expect.stringMatching(/0,00/), '0', '0', '0'])
    expect(cards[3]?.note).toBeNull()
  })
})

describe('customer filter query', () => {
  it('round-trips the filter through a pt-BR slug and falls back to all', () => {
    expect(customerFilterFromSlug(customerFilterSlug('lapsed'))).toBe('lapsed')
    expect(customerFilterSlug('lapsed')).toBe('sumidos')
    expect(customerFilterFromSlug('qualquer')).toBe('all')
    expect(customerFilterFromSlug(undefined)).toBe('all')
  })
})
