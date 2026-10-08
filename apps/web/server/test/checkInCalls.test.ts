import { describe, expect, it } from 'vitest'
import { shopJoinCall, visitCodeClaimCall, visitTokenClaimCall } from '../utils/checkInCalls'

const TOKEN = 'A'.repeat(43)

describe('shop join call', () => {
  it('goes to a fixed API path with only the validated code', () => {
    expect(shopJoinCall({ code: 'NAV4K7' })).toEqual({ method: 'POST', path: '/shop-join', body: { code: 'NAV4K7' } })
  })

  it('refuses extra fields, a missing code and a code that is too long', () => {
    expect(shopJoinCall({ code: 'NAV4K7', shopId: 'x' })).toBeNull()
    expect(shopJoinCall({})).toBeNull()
    expect(shopJoinCall({ code: 'A'.repeat(500) })).toBeNull()
    expect(shopJoinCall(undefined)).toBeNull()
  })
})

describe('visit token claim call', () => {
  it('sends the token in the body to the fixed path, never in the URL', () => {
    const call = visitTokenClaimCall({ token: TOKEN })
    expect(call).toEqual({ method: 'POST', path: '/check-in', body: { token: TOKEN } })
    expect(call?.path).not.toContain(TOKEN)
    expect(call?.query).toBeUndefined()
  })

  it('refuses a body that is not a token, and extra fields', () => {
    expect(visitTokenClaimCall({ token: TOKEN, customerId: 'x' })).toBeNull()
    expect(visitTokenClaimCall({ token: 'A'.repeat(500) })).toBeNull()
    expect(visitTokenClaimCall({ visitCode: 'K7M2P' })).toBeNull()
    expect(visitTokenClaimCall('')).toBeNull()
  })
})

describe('visit code claim call', () => {
  it('goes to its own path, the one the API rate limits per account', () => {
    expect(visitCodeClaimCall({ visitCode: 'K7M2P' })).toEqual({ method: 'POST', path: '/check-in/code', body: { visitCode: 'K7M2P' } })
  })

  it('refuses a token, extra fields and an oversized code', () => {
    expect(visitCodeClaimCall({ token: TOKEN })).toBeNull()
    expect(visitCodeClaimCall({ visitCode: 'K7M2P', extra: 1 })).toBeNull()
    expect(visitCodeClaimCall({ visitCode: 'K'.repeat(100) })).toBeNull()
  })
})
