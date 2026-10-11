import { describe, expect, it } from 'vitest'
import { assertMerchantBackendAllowed } from '../utils/merchantBackend'
import { SECURITY_HEADERS } from '../utils/securityHeaders'

describe('SECURITY_HEADERS', () => {
  it('keeps third-party sites from framing the app (clickjacking on the Balcão)', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("frame-ancestors 'self'")
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('SAMEORIGIN')
  })

  it('allows the camera only for the site itself (QR reader) and nothing else sensitive', () => {
    const policy = SECURITY_HEADERS['Permissions-Policy'] ?? ''
    expect(policy).toContain('camera=(self)')
    expect(policy).toContain('microphone=()')
    expect(policy).toContain('geolocation=()')
  })

  it('sends HSTS, nosniff and a referrer policy that never leaks the path to other sites', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toMatch(/^max-age=\d{8,}/)
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })
})

describe('assertMerchantBackendAllowed', () => {
  it('refuses the mock panel in a production build', () => {
    expect(() => assertMerchantBackendAllowed('mock', true)).toThrow(/not allowed/)
  })

  it('accepts http in production and the mock outside it', () => {
    expect(() => assertMerchantBackendAllowed('http', true)).not.toThrow()
    expect(() => assertMerchantBackendAllowed('mock', false)).not.toThrow()
  })
})
