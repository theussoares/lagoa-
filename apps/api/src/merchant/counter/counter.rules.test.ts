import { describe, expect, it } from 'vitest'
import { assertOperationalShop } from './counter.rules'

describe('counter rules', () => {
  it('allows approved shops and rejects pending or suspended shops', () => {
    expect(assertOperationalShop('approved')).toEqual({ ok: true, value: undefined })
    expect(assertOperationalShop('pending')).toEqual({ ok: false, error: { code: 'shopPendingApproval' } })
    expect(assertOperationalShop('suspended')).toEqual({ ok: false, error: { code: 'shopSuspended' } })
  })
})
