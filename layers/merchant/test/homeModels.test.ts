import { describe, expect, it } from 'vitest'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { Translate } from '#layers/core/app/utils/translate'
import { customerFilterFromSlug, customerFilterSlug } from '../app/utils/customerFilterQuery'
import { toWeekDayRows, toWeekHeadline } from '../app/utils/homeModels'

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
  }))
  return { days, visits: 0, customers: 0, newCustomers: 0, redemptions: 0, ...overrides }
}

describe('toWeekHeadline', () => {
  it('says the week numbers in one sentence', () => {
    const headline = toWeekHeadline(week({ visits: 3, customers: 2, newCustomers: 1, redemptions: 0 }), t)
    expect(headline).toContain('home.week.headline days=7')
    expect(headline).toContain('visits=home.week.visits count=3 #3')
    expect(headline).toContain('redemptions=home.week.redemptions count=0 #0')
  })

  it('has its own sentence for a week with no visits', () => {
    expect(toWeekHeadline(week(), t)).toBe('home.week.headlineEmpty days=7')
  })

  it('still mentions rewards handed out in a week with no visits', () => {
    expect(toWeekHeadline(week({ redemptions: 1 }), t)).toBe(
      'home.week.headlineOnlyRedemptions days=7 redemptions=home.week.redemptions count=1 #1',
    )
  })
})

describe('toWeekDayRows', () => {
  it('scales the ruler to the busiest day and marks today', () => {
    const base = week()
    const days = base.days.map((day, index) => (index === 4 ? { ...day, visits: 4, redemptions: 1 } : index === 6 ? { ...day, visits: 2, newCustomers: 1 } : day))
    const rows = toWeekDayRows({ ...base, days }, t)
    expect(rows[4]).toMatchObject({ ratio: 1, isToday: false, detail: 'home.week.redemptions count=1 #1' })
    expect(rows[6]).toMatchObject({ ratio: 0.5, isToday: true,  detail: 'home.week.newCustomers count=1 #1' })
    expect(rows[0]).toMatchObject({ ratio: 0, detail: null })
    expect(rows[0]?.label).toMatch(/26/)
    expect(rows[6]?.label).toMatch(/^home\.week\.today date=.*2/)
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
