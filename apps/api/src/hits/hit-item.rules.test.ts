import { describe, expect, it } from 'vitest'
import { HIT_ITEMS_MAX_FOUNDER, HIT_ITEMS_MAX_FOUNDER_PRO } from '#shared/constants/domain'
import { canCreateOrUnarchive, hitItemCap, isOnShowcase, planMerchantEdit, planReview } from './hit-item.rules'

const NOW = new Date('2026-10-19T12:00:00.000Z')

describe('hitItemCap', () => {
  it('is 5 for founder and 20 for founderPro', () => {
    expect(hitItemCap('founder')).toBe(HIT_ITEMS_MAX_FOUNDER)
    expect(hitItemCap('founderPro')).toBe(HIT_ITEMS_MAX_FOUNDER_PRO)
  })
})

describe('planMerchantEdit', () => {
  it.each(['pending', 'approved', 'rejected', 'archived'] as const)('sends %s back to pending and bumps the version', (status) => {
    expect(planMerchantEdit({ status, version: 3 })).toEqual({ status: 'pending', version: 4 })
  })
})

describe('canCreateOrUnarchive', () => {
  it('allows below the cap', () => {
    expect(canCreateOrUnarchive({ plan: 'founder', activeCount: 4 })).toEqual({ ok: true, value: undefined })
  })

  it('refuses at the cap for founder', () => {
    expect(canCreateOrUnarchive({ plan: 'founder', activeCount: 5 })).toEqual({ ok: false, error: { code: 'limitReached' } })
  })

  it('refuses a downgraded shop that still holds more items than its cap, without touching them', () => {
    expect(canCreateOrUnarchive({ plan: 'founder', activeCount: 12 })).toEqual({ ok: false, error: { code: 'limitReached' } })
  })

  it('allows founderPro up to 19 and refuses at 20', () => {
    expect(canCreateOrUnarchive({ plan: 'founderPro', activeCount: 19 }).ok).toBe(true)
    expect(canCreateOrUnarchive({ plan: 'founderPro', activeCount: 20 }).ok).toBe(false)
  })
})

describe('planReview', () => {
  it('approves a pending item when the version matches', () => {
    expect(planReview({ status: 'pending', version: 3 }, { action: 'approve', expectedVersion: 3 })).toEqual({
      ok: true,
      value: { to: 'approved', reason: null },
    })
  })

  it('answers conflict when the merchant edited after the admin opened it', () => {
    expect(planReview({ status: 'pending', version: 4 }, { action: 'approve', expectedVersion: 3 })).toEqual({
      ok: false,
      error: { code: 'conflict' },
    })
  })

  it('refuses to approve an item that is not pending', () => {
    expect(planReview({ status: 'archived', version: 1 }, { action: 'approve', expectedVersion: 1 })).toEqual({
      ok: false,
      error: { code: 'invalidTransition' },
    })
  })

  it('rejects a pending item with the reason', () => {
    expect(planReview({ status: 'pending', version: 1 }, { action: 'reject', reason: 'Foto borrada' })).toEqual({
      ok: true,
      value: { to: 'rejected', reason: 'Foto borrada' },
    })
  })

  it('refuses to reject an approved item', () => {
    const result = planReview({ status: 'approved', version: 1 }, { action: 'reject', reason: 'x' })
    expect(result).toEqual({ ok: false, error: { code: 'invalidTransition' } })
  })

  it('takes down an approved item as rejected', () => {
    expect(planReview({ status: 'approved', version: 2 }, { action: 'takeDown', reason: 'Denúncia' })).toEqual({
      ok: true,
      value: { to: 'rejected', reason: 'Denúncia' },
    })
  })

  it('refuses to take down a pending item', () => {
    expect(planReview({ status: 'pending', version: 1 }, { action: 'takeDown', reason: 'x' })).toEqual({
      ok: false,
      error: { code: 'invalidTransition' },
    })
  })
})

describe('isOnShowcase', () => {
  const base = { status: 'approved', endsAt: null, shopStatus: 'approved' } as const

  it('shows an approved item of an approved shop with no end date', () => {
    expect(isOnShowcase(base, NOW)).toBe(true)
  })

  it('shows an item that ends in the future', () => {
    expect(isOnShowcase({ ...base, endsAt: new Date('2026-10-20T00:00:00.000Z') }, NOW)).toBe(true)
  })

  it('hides when the shop is suspended', () => {
    expect(isOnShowcase({ ...base, shopStatus: 'suspended' }, NOW)).toBe(false)
  })

  it('hides when the shop is pending approval', () => {
    expect(isOnShowcase({ ...base, shopStatus: 'pending' }, NOW)).toBe(false)
  })

  it('hides when endsAt is in the past or exactly now', () => {
    expect(isOnShowcase({ ...base, endsAt: new Date('2026-10-18T00:00:00.000Z') }, NOW)).toBe(false)
    expect(isOnShowcase({ ...base, endsAt: NOW }, NOW)).toBe(false)
  })

  it.each(['pending', 'rejected', 'archived'] as const)('hides a %s item', (status) => {
    expect(isOnShowcase({ ...base, status }, NOW)).toBe(false)
  })
})
