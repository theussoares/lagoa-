import { describe, expect, it } from 'vitest'
import { cityHeaderImageUrl } from '../app/utils/cityHeaderImage'

describe('cityHeaderImageUrl', () => {
  it('falls back to the local illustration without a Supabase URL', () => {
    expect(cityHeaderImageUrl('')).toBe('/example/city.svg')
  })

  it('points at the public shop-assets bucket', () => {
    expect(cityHeaderImageUrl('https://abc.supabase.co')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/shop-assets/city/discover-header.webp',
    )
  })

  it('does not double the slash when the project URL ends with one', () => {
    expect(cityHeaderImageUrl('https://abc.supabase.co//')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/shop-assets/city/discover-header.webp',
    )
  })
})
