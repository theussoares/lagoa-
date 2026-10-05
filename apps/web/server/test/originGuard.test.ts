import { describe, expect, it } from 'vitest'
import { isTrustedOrigin, parseAllowedOrigins } from '../utils/originGuard'

const base = { host: 'app.lagoa.test', allowedOrigins: ['https://extra.test'] }

describe('isTrustedOrigin', () => {
  it('lets reads through without looking at the origin', () => {
    expect(isTrustedOrigin({ ...base, method: 'GET', origin: undefined })).toBe(true)
  })

  it('accepts writes from the same host', () => {
    expect(isTrustedOrigin({ ...base, method: 'POST', origin: 'https://app.lagoa.test' })).toBe(true)
  })

  it('accepts writes from a listed origin, ignoring the trailing slash', () => {
    expect(isTrustedOrigin({ ...base, method: 'DELETE', origin: 'https://extra.test/' })).toBe(true)
  })

  it('refuses writes from another site, with no origin, or with a garbled one', () => {
    expect(isTrustedOrigin({ ...base, method: 'POST', origin: 'https://evil.test' })).toBe(false)
    expect(isTrustedOrigin({ ...base, method: 'POST', origin: undefined })).toBe(false)
    expect(isTrustedOrigin({ ...base, method: 'PUT', origin: 'not a url' })).toBe(false)
  })

  it('parses the allowed list', () => {
    expect(parseAllowedOrigins(' https://a.test/ , ,https://b.test')).toEqual(['https://a.test', 'https://b.test'])
    expect(parseAllowedOrigins('')).toEqual([])
  })
})
