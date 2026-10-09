import { describe, expect, it } from 'vitest'
import { AMOUNT_MAX_CENTS } from '#shared/constants/domain'
import { VisitQrsRules } from './visit-qrs.rules'

describe('VisitQrsRules', () => {
  const rules = new VisitQrsRules()

  describe('planIssue', () => {
    it('accepts undefined amount for stamps program', () => {
      const result = rules.planIssue({ mode: 'stamps', target: 10 }, undefined)
      expect(result).toEqual({ ok: true, value: { kind: 'visit' } })
    })

    it('rejects amount on stamps program with amountNotAccepted', () => {
      const result = rules.planIssue({ mode: 'stamps', target: 10 }, 5000)
      expect(result).toEqual({ ok: false, error: { code: 'amountNotAccepted' } })
    })

    it('accepts valid amount on pointsPerCurrency program', () => {
      const result = rules.planIssue({ mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 }, 3200)
      expect(result).toEqual({ ok: true, value: { kind: 'amount', amountCents: 3200 } })
    })

    it('rejects missing amount on pointsPerCurrency program with invalidAmount', () => {
      const result = rules.planIssue({ mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 }, undefined)
      expect(result).toEqual({ ok: false, error: { code: 'invalidAmount' } })
    })

    it('rejects 0 or negative amount on pointsPerCurrency program', () => {
      const zero = rules.planIssue({ mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 }, 0)
      expect(zero).toEqual({ ok: false, error: { code: 'invalidAmount' } })
    })

    it('rejects amount above ceiling', () => {
      const above = rules.planIssue({ mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 }, AMOUNT_MAX_CENTS + 1)
      expect(above).toEqual({ ok: false, error: { code: 'invalidAmount' } })
    })
  })

  describe('deriveStatus', () => {
    const base = new Date('2026-10-07T12:00:00Z')
    const expiresAt = new Date('2026-10-07T12:05:00Z')

    it('returns active before expiration', () => {
      const status = rules.deriveStatus('active', expiresAt, new Date('2026-10-07T12:04:59Z'))
      expect(status).toBe('active')
    })

    it('derives expired at or after expiration', () => {
      const status = rules.deriveStatus('active', expiresAt, new Date('2026-10-07T12:05:00Z'))
      expect(status).toBe('expired')
    })

    it('keeps claimed or cancelled unchanged even after expiration', () => {
      expect(rules.deriveStatus('claimed', expiresAt, new Date('2026-10-07T12:10:00Z'))).toBe('claimed')
      expect(rules.deriveStatus('cancelled', expiresAt, new Date('2026-10-07T12:10:00Z'))).toBe('cancelled')
    })
  })
})
