import { describe, expect, it } from 'vitest'
import { FEATURED_PAID_SLOTS_DISCOVER, FEATURED_PAID_SLOTS_HITS } from '#shared/constants/domain'
import { availabilityByDay, paidSlotsFor, peakOverlap, planPlacement } from './featured.rules'

const SHOP = '0190a000-0000-7000-8000-00000000b001'
const OTHER_SHOP = '0190a000-0000-7000-8000-00000000b002'
const period = (startsAt: string, endsAt: string) => ({ startsAt: new Date(startsAt), endsAt: new Date(endsAt) })
const fullNovember = Array.from({ length: FEATURED_PAID_SLOTS_DISCOVER }, () => period('2026-11-10T04:00:00Z', '2026-11-20T04:00:00Z'))

describe('paidSlotsFor', () => {
  it('uses the paid slots of each surface', () => {
    expect(paidSlotsFor('discoverCarousel')).toBe(FEATURED_PAID_SLOTS_DISCOVER)
    expect(paidSlotsFor('hitsBanner')).toBe(FEATURED_PAID_SLOTS_HITS)
  })
})

describe('peakOverlap', () => {
  it('is zero without existing periods', () => {
    expect(peakOverlap([], period('2026-11-10T00:00:00Z', '2026-11-11T00:00:00Z'))).toBe(0)
  })

  it('counts the most periods live at the same instant inside the candidate, not every period that touches it', () => {
    const existing = [period('2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z'), period('2026-11-06T00:00:00Z', '2026-11-09T00:00:00Z'), period('2026-11-04T00:00:00Z', '2026-11-07T00:00:00Z')]
    expect(peakOverlap(existing, period('2026-11-01T00:00:00Z', '2026-11-10T00:00:00Z'))).toBe(2)
  })

  it('treats periods as half-open: one ending when the next starts never overlaps it', () => {
    const existing = [period('2026-11-01T00:00:00Z', '2026-11-05T00:00:00Z'), period('2026-11-05T00:00:00Z', '2026-11-09T00:00:00Z')]
    expect(peakOverlap(existing, period('2026-11-01T00:00:00Z', '2026-11-09T00:00:00Z'))).toBe(1)
    expect(peakOverlap(existing, period('2026-11-09T00:00:00Z', '2026-11-10T00:00:00Z'))).toBe(0)
    expect(peakOverlap(existing, period('2026-10-30T00:00:00Z', '2026-11-01T00:00:00Z'))).toBe(0)
  })

  it('only counts the part of a period inside the candidate', () => {
    const existing = [period('2026-11-01T00:00:00Z', '2026-11-03T00:00:00Z'), period('2026-11-05T00:00:00Z', '2026-11-08T00:00:00Z')]
    expect(peakOverlap(existing, period('2026-11-02T00:00:00Z', '2026-11-06T00:00:00Z'))).toBe(1)
  })
})

describe('planPlacement', () => {
  const carousel = (candidate: { startsAt: Date; endsAt: Date }, existing: readonly { startsAt: Date; endsAt: Date }[] = []) =>
    planPlacement({ candidate, existing, surface: 'discoverCarousel', shopStatus: 'approved', hitItem: null, shopId: SHOP })

  it('refuses 15–16/11 when the 4 Discover slots are taken from 10 to 20/11', () => {
    expect(carousel(period('2026-11-15T04:00:00Z', '2026-11-16T04:00:00Z'), fullNovember)).toEqual({ ok: false, error: { code: 'slotsFull' } })
  })

  it('accepts 20–25/11 right after, since the taken periods end when it starts', () => {
    expect(carousel(period('2026-11-20T04:00:00Z', '2026-11-25T04:00:00Z'), fullNovember)).toEqual({ ok: true, value: undefined })
  })

  it('refuses a long period when any instant of it is full', () => {
    expect(carousel(period('2026-11-01T04:00:00Z', '2026-11-30T04:00:00Z'), fullNovember)).toEqual({ ok: false, error: { code: 'slotsFull' } })
  })

  it('accepts while one slot is still free', () => {
    expect(carousel(period('2026-11-15T04:00:00Z', '2026-11-16T04:00:00Z'), fullNovember.slice(1))).toEqual({ ok: true, value: undefined })
  })

  it.each(['pending', 'suspended'] as const)('refuses a %s shop as invalidTarget', (shopStatus) => {
    const plan = planPlacement({ candidate: period('2026-11-15T04:00:00Z', '2026-11-16T04:00:00Z'), existing: [], surface: 'discoverCarousel', shopStatus, hitItem: null, shopId: SHOP })
    expect(plan).toEqual({ ok: false, error: { code: 'invalidTarget' } })
  })

  const banner = (hitItem: { status: 'pending' | 'approved' | 'rejected' | 'archived'; shopId: string } | null) =>
    planPlacement({ candidate: period('2026-11-15T04:00:00Z', '2026-11-16T04:00:00Z'), existing: [], surface: 'hitsBanner', shopStatus: 'approved', hitItem, shopId: SHOP })

  it('refuses a banner whose item is pending', () => {
    expect(banner({ status: 'pending', shopId: SHOP })).toEqual({ ok: false, error: { code: 'invalidTarget' } })
  })

  it('refuses a banner with an item of another shop, or without an item', () => {
    expect(banner({ status: 'approved', shopId: OTHER_SHOP })).toEqual({ ok: false, error: { code: 'invalidTarget' } })
    expect(banner(null)).toEqual({ ok: false, error: { code: 'invalidTarget' } })
  })

  it('accepts a banner with an approved item of the shop', () => {
    expect(banner({ status: 'approved', shopId: SHOP })).toEqual({ ok: true, value: undefined })
  })

  it('refuses a full Hits banner surface at its own slot count', () => {
    const taken = Array.from({ length: FEATURED_PAID_SLOTS_HITS }, () => period('2026-11-10T04:00:00Z', '2026-11-20T04:00:00Z'))
    const plan = planPlacement({ candidate: period('2026-11-15T04:00:00Z', '2026-11-16T04:00:00Z'), existing: taken, surface: 'hitsBanner', shopStatus: 'approved', hitItem: { status: 'approved', shopId: SHOP }, shopId: SHOP })
    expect(plan).toEqual({ ok: false, error: { code: 'slotsFull' } })
  })
})

describe('availabilityByDay', () => {
  it('gives the free slots of each local day of [from, to), by the peak inside the day', () => {
    // Um destaque termina às 12h locais de 11/11 e outro começa às 12h: o dia 11 tem pico 1, não 2.
    const existing = [period('2026-11-09T04:00:00Z', '2026-11-11T16:00:00Z'), period('2026-11-11T16:00:00Z', '2026-11-13T04:00:00Z')]
    expect(availabilityByDay(existing, 'discoverCarousel', '2026-11-10', '2026-11-14')).toEqual([
      { date: '2026-11-10', freeSlots: FEATURED_PAID_SLOTS_DISCOVER - 1 },
      { date: '2026-11-11', freeSlots: FEATURED_PAID_SLOTS_DISCOVER - 1 },
      { date: '2026-11-12', freeSlots: FEATURED_PAID_SLOTS_DISCOVER - 1 },
      { date: '2026-11-13', freeSlots: FEATURED_PAID_SLOTS_DISCOVER },
    ])
  })

  it('cuts days at local midnight (04:00 UTC), not UTC midnight', () => {
    // Termina às 23h59 locais de 10/11 (03:59 UTC de 11/11): não ocupa o dia 11.
    const existing = [period('2026-11-10T04:00:00Z', '2026-11-11T04:00:00Z')]
    expect(availabilityByDay(existing, 'hitsBanner', '2026-11-10', '2026-11-12')).toEqual([
      { date: '2026-11-10', freeSlots: FEATURED_PAID_SLOTS_HITS - 1 },
      { date: '2026-11-11', freeSlots: FEATURED_PAID_SLOTS_HITS },
    ])
  })

  it('never goes below zero', () => {
    const existing = Array.from({ length: FEATURED_PAID_SLOTS_HITS + 1 }, () => period('2026-11-10T04:00:00Z', '2026-11-11T04:00:00Z'))
    expect(availabilityByDay(existing, 'hitsBanner', '2026-11-10', '2026-11-11')).toEqual([{ date: '2026-11-10', freeSlots: 0 }])
  })
})
