import { describe, expect, it } from 'vitest'
import { assertOperationalShop, validateRegisterInput } from './counter.rules'

describe('counter rules', () => {
  it('allows approved shops and rejects pending or suspended shops', () => {
    expect(assertOperationalShop('approved')).toEqual({ ok: true, value: undefined })
    expect(assertOperationalShop('pending')).toEqual({ ok: false, error: { code: 'shopPendingApproval' } })
    expect(assertOperationalShop('suspended')).toEqual({ ok: false, error: { code: 'shopSuspended' } })
  })

  it('validates amount input against program mode', () => {
    const stamps = { mode: 'stamps' as const, target: 10 }
    const pointsCurrency = { mode: 'pointsPerCurrency' as const, pointsPerReal: 2, target: 100 }

    expect(validateRegisterInput(stamps, { kind: 'visit' })).toEqual({ ok: true, value: undefined })
    expect(validateRegisterInput(stamps, { kind: 'amount', amountCents: 5000 })).toEqual({
      ok: false,
      error: { code: 'amountNotAccepted' },
    })

    expect(validateRegisterInput(pointsCurrency, { kind: 'amount', amountCents: 5000 })).toEqual({
      ok: true,
      value: undefined,
    })
    expect(validateRegisterInput(pointsCurrency, { kind: 'amount', amountCents: -10 })).toEqual({
      ok: false,
      error: { code: 'invalidAmount' },
    })
    expect(validateRegisterInput(pointsCurrency, { kind: 'amount', amountCents: 0 })).toEqual({
      ok: false,
      error: { code: 'invalidAmount' },
    })
  })
})
