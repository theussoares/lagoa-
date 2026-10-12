import { describe, expect, it } from 'vitest'
import { bffSecurityEvent } from '../utils/securityEvents'

describe('bffSecurityEvent', () => {
  it('keeps only the BFF path and the platform request id, never the query string', () => {
    const request = { method: 'POST', url: new URL('https://app.lagoa.test/api/auth/verify?phone=67991230374'), requestId: 'gru1::abc' }
    const entry = bffSecurityEvent(request, { event: 'auth.login', outcome: 'failure', code: 'invalidLoginCode' })
    expect(entry).toEqual({
      event: 'auth.login',
      outcome: 'failure',
      code: 'invalidLoginCode',
      method: 'POST',
      route: '/api/auth/verify',
      requestId: 'gru1::abc',
    })
    expect(JSON.stringify(entry)).not.toContain('67991230374')
  })
})
