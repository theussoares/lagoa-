import { describe, expect, it } from 'vitest'
import { clientIpOf, trustedClientIp, rememberClientIp } from './client-ip'

const SECRET = 'x'.repeat(32)

describe('trustedClientIp', () => {
  it('believes the claimed IP when the BFF proves itself', () => {
    expect(trustedClientIp({ secret: SECRET, presentedSecret: SECRET, claimedIp: '203.0.113.9' })).toBe('203.0.113.9')
    expect(trustedClientIp({ secret: SECRET, presentedSecret: SECRET, claimedIp: '2001:db8::1' })).toBe('2001:db8::1')
  })

  it('ignores the claim with a wrong, missing or unconfigured secret', () => {
    expect(trustedClientIp({ secret: SECRET, presentedSecret: 'y'.repeat(32), claimedIp: '203.0.113.9' })).toBeNull()
    expect(trustedClientIp({ secret: SECRET, presentedSecret: undefined, claimedIp: '203.0.113.9' })).toBeNull()
    expect(trustedClientIp({ secret: undefined, presentedSecret: SECRET, claimedIp: '203.0.113.9' })).toBeNull()
  })

  it('ignores a claim that is not an IP', () => {
    expect(trustedClientIp({ secret: SECRET, presentedSecret: SECRET, claimedIp: 'victim' })).toBeNull()
  })
})

describe('clientIpOf', () => {
  it('prefers the IP the BFF vouched for, then the socket one', () => {
    const vouched = { ip: '10.0.0.1' }
    rememberClientIp(vouched, '203.0.113.9')
    expect(clientIpOf(vouched)).toBe('203.0.113.9')
    expect(clientIpOf({ ip: '10.0.0.1' })).toBe('10.0.0.1')
    expect(clientIpOf({})).toBe('unknown')
  })
})
