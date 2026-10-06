import { describe, expect, it } from 'vitest'
import { VISIT_TOKEN_BYTES, VISIT_TOKEN_LENGTH } from '#shared/constants/domain'
import { VisitTokenSchema } from '#shared/schemas/visitQr'
import { generateVisitToken, hashVisitToken } from './visit-token'

describe('generateVisitToken', () => {
  it('makes a base64url token of the contract length that the schema accepts', () => {
    const token = generateVisitToken()
    expect(token).toHaveLength(VISIT_TOKEN_LENGTH)
    expect(VisitTokenSchema.safeParse(token).success).toBe(true)
    expect(Buffer.from(token, 'base64url')).toHaveLength(VISIT_TOKEN_BYTES)
  })

  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 200 }, generateVisitToken)).size).toBe(200)
  })
})

describe('hashVisitToken', () => {
  it('is a stable SHA-256 of the token text', () => {
    const token = generateVisitToken()
    expect(hashVisitToken(token).equals(hashVisitToken(token))).toBe(true)
    expect(hashVisitToken(token)).toHaveLength(32)
  })

  it('differs from one token to another and never contains the token', () => {
    const [a, b] = [generateVisitToken(), generateVisitToken()]
    expect(hashVisitToken(a).equals(hashVisitToken(b))).toBe(false)
    expect(hashVisitToken(a).toString('utf8')).not.toContain(a)
  })
})
