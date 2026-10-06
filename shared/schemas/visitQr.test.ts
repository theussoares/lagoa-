import { describe, expect, it } from 'vitest'
import { ShopJoinRequestSchema } from './shop'
import { VisitCodeClaimRequestSchema, VisitQrClaimRequestSchema } from './visit'
import { VisitCodeSchema, VisitQrIssueRequestSchema, VisitTokenSchema } from './visitQr'

const TOKEN = 'Ab3_-xYz0123456789Ab3_-xYz0123456789Ab3_-xY'

describe('VisitQrClaimRequestSchema (CA-12)', () => {
  it('accepts the token or the legacy shop code', () => {
    expect(VisitQrClaimRequestSchema.safeParse({ token: TOKEN }).success).toBe(true)
    expect(VisitQrClaimRequestSchema.safeParse({ code: 'NAV4K7' }).success).toBe(true)
  })

  it.each([
    { token: TOKEN, amountCents: 4590 },
    { code: 'NAV4K7', amountCents: 4590 },
    { token: TOKEN, code: 'NAV4K7' },
    { amountCents: 4590 },
    {},
    { token: 'x'.repeat(65) },
  ])('rejects %j', (body) => {
    expect(VisitQrClaimRequestSchema.safeParse(body).success).toBe(false)
  })
})

describe('VisitCodeClaimRequestSchema', () => {
  it('accepts only the short code', () => {
    expect(VisitCodeClaimRequestSchema.safeParse({ visitCode: 'k7m3p' }).success).toBe(true)
    expect(VisitCodeClaimRequestSchema.safeParse({ visitCode: 'K7M3P', amountCents: 1 }).success).toBe(false)
    expect(VisitCodeClaimRequestSchema.safeParse({ visitCode: 'x'.repeat(33) }).success).toBe(false)
  })
})

describe('ShopJoinRequestSchema', () => {
  it('accepts the poster code and nothing else', () => {
    expect(ShopJoinRequestSchema.safeParse({ code: 'NAV4K7' }).success).toBe(true)
    expect(ShopJoinRequestSchema.safeParse({ code: 'NAV4K7', token: TOKEN }).success).toBe(false)
  })
})

describe('VisitQrIssueRequestSchema', () => {
  it.each([{}, { amountCents: 4590 }])('accepts %j', (body) => {
    expect(VisitQrIssueRequestSchema.safeParse(body).success).toBe(true)
  })

  it.each([{ amountCents: 0 }, { amountCents: 10.5 }, { amountCents: 10_000_01 }, { customerId: 'c1' }])('rejects %j', (body) => {
    expect(VisitQrIssueRequestSchema.safeParse(body).success).toBe(false)
  })
})

describe('VisitTokenSchema / VisitCodeSchema', () => {
  it('keeps the token and short code formats apart from the shop code', () => {
    expect(VisitTokenSchema.safeParse(TOKEN).success).toBe(true)
    expect(VisitCodeSchema.safeParse('K7M3P').success).toBe(true)
    expect(VisitCodeSchema.safeParse('NAV4K7').success).toBe(false)
  })
})
