import { describe, expect, it } from 'vitest'
import { RankingConsentUpdateSchema } from '#shared/schemas/ranking'
import { localMonthBounds } from '#shared/utils/time'

describe('localMonthBounds', () => {
  it('uses the city month: 23:30 on the last day in UTC-4 still belongs to that month', () => {
    // 2026-11-01T02:30Z = 2026-10-31 22:30 em Três Lagoas
    const { month, start, end } = localMonthBounds(new Date('2026-11-01T02:30:00Z'))
    expect(month).toBe('2026-10')
    expect(start.toISOString()).toBe('2026-10-01T04:00:00.000Z')
    expect(end.toISOString()).toBe('2026-11-01T04:00:00.000Z')
  })

  it('rolls December into January of the next year', () => {
    const { month, end } = localMonthBounds(new Date('2026-12-15T12:00:00Z'))
    expect(month).toBe('2026-12')
    expect(end.toISOString()).toBe('2027-01-01T04:00:00.000Z')
  })
})

describe('RankingConsentUpdateSchema', () => {
  it('asks for a nickname to join and nothing to leave', () => {
    expect(RankingConsentUpdateSchema.safeParse({ granted: true }).success).toBe(false)
    expect(RankingConsentUpdateSchema.safeParse({ granted: true, name: ' A ' }).success).toBe(false)
    expect(RankingConsentUpdateSchema.parse({ granted: true, name: ' Ana ' })).toEqual({ granted: true, name: 'Ana' })
    expect(RankingConsentUpdateSchema.safeParse({ granted: false }).success).toBe(true)
  })
})
