import { describe, expect, it } from 'vitest'
import { decodeCursor, encodeCursor, pageOf, planShopAction, rankOf } from './shops.rules'

describe('planShopAction', () => {
  it('approves only a pending shop', () => {
    expect(planShopAction({ action: 'approve' })).toEqual({ status: 'approved', allowedFrom: ['pending'] })
  })

  it('suspends a pending or approved shop and carries the reason', () => {
    expect(planShopAction({ action: 'suspend', reason: 'fraude' })).toEqual({ status: 'suspended', reason: 'fraude', allowedFrom: ['pending', 'approved'] })
  })

  it('reactivates only a suspended shop', () => {
    expect(planShopAction({ action: 'reactivate' })).toEqual({ status: 'approved', allowedFrom: ['suspended'] })
  })

  it('changes the plan from any status', () => {
    expect(planShopAction({ action: 'changePlan', plan: 'founderPro' })).toEqual({ plan: 'founderPro' })
  })
})

describe('shop list cursor', () => {
  const id = '0190a000-0000-7000-8000-00000000a001'

  it('puts pending first', () => {
    expect([rankOf('pending'), rankOf('approved'), rankOf('suspended')]).toEqual([0, 1, 1])
  })

  it('round-trips', () => {
    expect(decodeCursor(encodeCursor({ rank: 0, id }))).toEqual({ rank: 0, id })
    expect(decodeCursor(encodeCursor({ rank: 1, id }))).toEqual({ rank: 1, id })
  })

  it('has no next page when the extra row did not come', () => {
    const rows = [{ id, status: 'approved' as const }]
    expect(pageOf(rows, 1)).toEqual({ items: rows, nextCursor: null })
  })

  it('cuts the extra row and points at the last shown one', () => {
    const rows = [
      { id: 'a', status: 'pending' as const },
      { id: 'b', status: 'approved' as const },
      { id: 'c', status: 'approved' as const },
    ]
    expect(pageOf(rows, 2)).toEqual({ items: rows.slice(0, 2), nextCursor: '1:b' })
  })
})
