import { describe, expect, it } from 'vitest'
import { buildUpstreamUrl, requestHeadersFor, responseHeadersFor, splitProxyPath } from '../utils/upstream'

describe('splitProxyPath', () => {
  it('keeps path and query after the proxy prefix', () => {
    expect(splitProxyPath('/api/v1/customer/cards?limit=5')).toEqual({ path: '/customer/cards', search: '?limit=5' })
  })

  it('refuses what is not under the prefix or tries to climb out of it', () => {
    expect(splitProxyPath('/api/auth/otp')).toBeNull()
    expect(splitProxyPath('/api/v1/../admin')).toBeNull()
  })
})

describe('buildUpstreamUrl', () => {
  it('joins the configured base with the path, whatever the trailing slash', () => {
    expect(buildUpstreamUrl({ baseUrl: 'https://api.test/v1/', path: '/x', search: '?a=1' })).toBe('https://api.test/v1/x?a=1')
  })
})

describe('headers', () => {
  it('forwards only the allowed request headers and sets the bearer', () => {
    const incoming = new Headers({ cookie: 'lagoa_at=secret', origin: 'https://app.test', authorization: 'Bearer forged', 'content-type': 'application/json' })
    expect(requestHeadersFor(incoming, 'jwt')).toEqual({ 'content-type': 'application/json', authorization: 'Bearer jwt' })
  })

  it('does not bring set-cookie or CORS headers back from the API', () => {
    const upstream = new Headers({ 'set-cookie': 'x=1', 'access-control-allow-origin': '*', 'retry-after': '30', 'content-type': 'application/json' })
    expect(responseHeadersFor(upstream)).toEqual({ 'retry-after': '30', 'content-type': 'application/json' })
  })
})
