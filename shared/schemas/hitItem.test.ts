import { describe, expect, it } from 'vitest'
import { FeaturedPlacementDraftSchema } from './featured'
import { HitItemDraftSchema } from './hitItem'
import { HitItemReviewSchema } from './admin'

const minimalDraft = { title: 'Corte masculino', description: null, priceCents: null, contact: null, endsAt: null }

describe('HitItemDraftSchema', () => {
  it('accepts the minimal draft', () => {
    expect(HitItemDraftSchema.safeParse(minimalDraft).success).toBe(true)
  })

  it('rejects a zero price', () => {
    expect(HitItemDraftSchema.safeParse({ ...minimalDraft, priceCents: 0 }).success).toBe(false)
  })

  it('rejects a title of 61 characters', () => {
    expect(HitItemDraftSchema.safeParse({ ...minimalDraft, title: 'a'.repeat(61) }).success).toBe(false)
    expect(HitItemDraftSchema.safeParse({ ...minimalDraft, title: 'a'.repeat(60) }).success).toBe(true)
  })

  it('rejects a non-https contact url', () => {
    const contact = { kind: 'url', url: 'http://loja.example', ctaLabel: 'Ver' }
    expect(HitItemDraftSchema.safeParse({ ...minimalDraft, contact }).success).toBe(false)
  })

  it('rejects unknown fields', () => {
    expect(HitItemDraftSchema.safeParse({ ...minimalDraft, status: 'approved' }).success).toBe(false)
  })
})

describe('FeaturedPlacementDraftSchema', () => {
  const base = {
    shopId: '11111111-1111-4111-8111-111111111111',
    startsAt: '2026-11-01T00:00:00Z',
    endsAt: '2026-11-08T00:00:00Z',
    note: null,
  }
  const hitItemId = '22222222-2222-4222-8222-222222222222'

  it('accepts a carousel placement without hit item and a banner with one', () => {
    expect(FeaturedPlacementDraftSchema.safeParse({ ...base, surface: 'discoverCarousel', hitItemId: null }).success).toBe(true)
    expect(FeaturedPlacementDraftSchema.safeParse({ ...base, surface: 'hitsBanner', hitItemId }).success).toBe(true)
  })

  it('rejects a hits banner without hit item', () => {
    expect(FeaturedPlacementDraftSchema.safeParse({ ...base, surface: 'hitsBanner', hitItemId: null }).success).toBe(false)
  })

  it('rejects a discover carousel with hit item', () => {
    expect(FeaturedPlacementDraftSchema.safeParse({ ...base, surface: 'discoverCarousel', hitItemId }).success).toBe(false)
  })

  it('rejects an end that is not after the start', () => {
    const same = { ...base, surface: 'discoverCarousel', hitItemId: null, endsAt: base.startsAt }
    expect(FeaturedPlacementDraftSchema.safeParse(same).success).toBe(false)
  })
})

describe('HitItemReviewSchema', () => {
  it('requires expectedVersion to approve and a reason to reject', () => {
    expect(HitItemReviewSchema.safeParse({ action: 'approve', expectedVersion: 1 }).success).toBe(true)
    expect(HitItemReviewSchema.safeParse({ action: 'approve' }).success).toBe(false)
    expect(HitItemReviewSchema.safeParse({ action: 'approve', expectedVersion: 0 }).success).toBe(false)
    expect(HitItemReviewSchema.safeParse({ action: 'reject', reason: 'Foto borrada' }).success).toBe(true)
    expect(HitItemReviewSchema.safeParse({ action: 'reject' }).success).toBe(false)
  })
})
