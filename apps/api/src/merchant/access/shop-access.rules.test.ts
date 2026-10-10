import { describe, expect, it } from 'vitest'
import { requireOperational } from './shop-access.rules'

describe('requireOperational', () => {
  it('lets an approved shop through', () => {
    expect(requireOperational('approved')).toEqual({ ok: true, value: undefined })
  })

  it('names why a shop that is not approved cannot touch customers', () => {
    expect(requireOperational('pending')).toEqual({ ok: false, error: { code: 'shopPendingApproval' } })
    expect(requireOperational('suspended')).toEqual({ ok: false, error: { code: 'shopSuspended' } })
  })
})
