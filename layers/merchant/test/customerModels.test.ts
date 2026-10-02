import { describe, expect, it } from 'vitest'
import { MerchantCustomerRowSchema } from '#shared/schemas/customer'
import type { MerchantCustomerRow } from '#shared/schemas/customer'
import type { Translate } from '#layers/core/app/utils/translate'
import { toCustomerRowModel } from '../app/utils/customerModels'

const t: Translate = (key, named = {}, plural) =>
  [key, ...Object.entries(named).map(([name, value]) => `${name}=${String(value)}`), plural === undefined ? '' : `#${plural}`]
    .filter(Boolean)
    .join(' ')

const now = new Date('2026-10-02T15:00:00.000Z')

function row(overrides: Partial<MerchantCustomerRow>): MerchantCustomerRow {
  return MerchantCustomerRowSchema.parse({
    customerId: 'cus_ana',
    maskedPhone: '(67) 9••••-0374',
    firstName: 'Ana',
    unit: 'stamp',
    balance: 7,
    target: 10,
    visitsCount: 9,
    lastVisitAt: '2026-09-29T15:00:00.000Z',
    isLapsed: false,
    acceptsNotifications: true,
    ...overrides,
  })
}

describe('toCustomerRowModel', () => {
  it('keeps the phone masked and shows progress against the target', () => {
    const model = toCustomerRowModel(row({}), now, t)
    expect(model.phone).toBe('(67) 9••••-0374')
    expect(model.progress).toBe('customers.progress balance=7 target=10 units=units.stampNoun #10')
    expect(model.progressRatio).toBeCloseTo(0.7)
    expect(model.rewardReady).toBe(false)
    expect(model.visits).toBe('9')
  })

  it('caps the ratio and flags the reward when the card is full', () => {
    const model = toCustomerRowModel(row({ balance: 12, target: 10 }), now, t)
    expect(model.progressRatio).toBe(1)
    expect(model.rewardReady).toBe(true)
  })

  it('describes the last visit in days', () => {
    expect(toCustomerRowModel(row({}), now, t).lastVisit).toBe('customers.lastVisit.daysAgo count=3 #3')
    expect(toCustomerRowModel(row({ lastVisitAt: '2026-10-02T09:00:00.000Z' }), now, t).lastVisit).toBe('customers.lastVisit.today')
    expect(toCustomerRowModel(row({ lastVisitAt: null }), now, t).lastVisit).toBe('customers.lastVisit.never')
  })

  it('keeps a missing name as null so the table can say so', () => {
    expect(toCustomerRowModel(row({ firstName: null }), now, t).name).toBeNull()
  })
})
