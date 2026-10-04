import { describe, expect, it } from 'vitest'
import type { WalletActivity } from '#shared/schemas/visit'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import { catalogShop } from '../../shops/catalog.fixtures'
import { activityRecord, walletCardRecord } from './wallet.fixtures'
import { toWalletActivity, toWalletCard } from './wallet.mapper'

const URL = 'https://project.supabase.co'
const NOW = new Date('2026-10-03T12:00:00Z')

function cardOf(record = walletCardRecord()): WalletCard {
  const result = toWalletCard(record, URL, NOW)
  if (!result.ok) throw new Error('expected a valid card')
  return result.value
}

function activityOf(record = activityRecord()): WalletActivity {
  const result = toWalletActivity(record)
  if (!result.ok) throw new Error('expected a valid activity')
  return result.value
}

describe('toWalletCard', () => {
  it('builds a stamp card with the stamps derived from the ledger', () => {
    const card = cardOf(
      walletCardRecord({
        balance: 2,
        lastVisitAt: new Date('2026-10-03T12:00:00Z'),
        earned: [
          { kind: 'checkIn', units: 1, occurredAt: new Date('2026-10-03T12:00:00Z') },
          { kind: 'visit', units: 1, occurredAt: new Date('2026-10-01T12:00:00Z') },
        ],
      }),
    )
    expect(card).toMatchObject({ unit: 'stamp', balance: 2, target: 10, rewardTitle: 'Corte grátis', lastVisitAt: '2026-10-03T12:00:00.000Z' })
    expect(card.stamps.map((s) => [s.number, s.source])).toEqual([[1, 'counter'], [2, 'checkIn']])
  })

  it('has no stamps in a points club', () => {
    const shop = catalogShop({ program: { ...catalogShop().program, rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 } } })
    const card = cardOf(walletCardRecord({ balance: 30, shop }))
    expect(card).toMatchObject({ unit: 'point', balance: 30, target: 100 })
    expect(card.stamps).toEqual([])
  })

  it('carries the shop summary and never the customer id', () => {
    const card = cardOf()
    expect(card.shop.name).toBe('Barbearia do Zé')
    expect('customerId' in card).toBe(false)
  })

  it('keeps the reward expiry when set', () => {
    expect(cardOf(walletCardRecord({ rewardExpiresAt: new Date('2026-11-01T00:00:00Z') })).rewardExpiresAt).toBe('2026-11-01T00:00:00.000Z')
  })
})

describe('toWalletActivity', () => {
  it('shows the units a visit earned', () => {
    expect(activityOf()).toMatchObject({ kind: 'visit', units: 1, shopName: 'Barbearia do Zé', rewardTitle: null })
  })

  it('shows 0 units on a redemption, where the ledger holds the debit, and keeps the reward title', () => {
    expect(activityOf(activityRecord({ kind: 'redemption', unitsDelta: -10, rewardTitle: 'Corte grátis' }))).toMatchObject({
      kind: 'redemption',
      units: 0,
      rewardTitle: 'Corte grátis',
    })
  })
})

describe('toWalletCard with expiry', () => {
  const earned = [
    { kind: 'visit' as const, units: 1, occurredAt: new Date('2026-03-02T12:00:00Z') },
    { kind: 'visit' as const, units: 1, occurredAt: new Date('2026-03-01T12:00:00Z') },
  ]
  const sixMonths = (): ReturnType<typeof catalogShop> =>
    catalogShop({ program: { ...catalogShop().program, expiration: { kind: 'afterInactivity', months: 6 } } })

  it('shows an empty card once the inactivity window passed, before anyone writes the expiration', () => {
    const card = cardOf(walletCardRecord({ balance: 2, lastVisitAt: new Date('2026-03-02T12:00:00Z'), earned, shop: sixMonths() }))
    expect(card).toMatchObject({ balance: 0, stamps: [], rewardExpiresAt: null })
  })

  it('keeps the card while the window is open', () => {
    const card = cardOf(walletCardRecord({ balance: 2, lastVisitAt: new Date('2026-08-01T12:00:00Z'), earned, shop: sixMonths() }))
    expect(card.balance).toBe(2)
    expect(card.stamps).toHaveLength(2)
  })

  it('takes one target away when the held reward lapsed and re-derives the stamps from what is left', () => {
    const shop = catalogShop({ program: { ...catalogShop().program, rules: { mode: 'stamps', target: 3 } } })
    const manyEarned = Array.from({ length: 4 }, (_, index) => ({ kind: 'visit' as const, units: 1, occurredAt: new Date(Date.UTC(2026, 8, 20 - index, 12)) }))
    const card = cardOf(walletCardRecord({ balance: 4, rewardExpiresAt: new Date('2026-10-01T00:00:00Z'), earned: manyEarned, shop }))
    expect(card.balance).toBe(1)
    expect(card.stamps.map((stamp) => stamp.earnedAt)).toEqual(['2026-09-20T12:00:00.000Z'])
    expect(card.rewardExpiresAt).toBeNull()
  })
})

