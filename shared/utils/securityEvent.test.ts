import { describe, expect, it } from 'vitest'
import { securityLogLine } from './securityEvent'

describe('securityLogLine', () => {
  it('writes one JSON line tagged as security, with the timestamp and without empty fields', () => {
    const line = securityLogLine(
      { event: 'auth.login', outcome: 'failure', method: 'POST', route: '/api/auth/verify', code: 'invalidLoginCode' },
      new Date('2026-10-10T12:00:00Z'),
    )
    expect(line).not.toContain('\n')
    expect(JSON.parse(line)).toEqual({
      type: 'security',
      at: '2026-10-10T12:00:00.000Z',
      event: 'auth.login',
      outcome: 'failure',
      method: 'POST',
      route: '/api/auth/verify',
      code: 'invalidLoginCode',
    })
  })
})
