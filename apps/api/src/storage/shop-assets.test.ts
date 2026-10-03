import { describe, expect, it } from 'vitest'
import { shopAssetUrl } from './shop-assets'

describe('shopAssetUrl', () => {
  it('does not double the slash when the project URL ends with one', () => {
    expect(shopAssetUrl('https://p.supabase.co/', 'shops/a/logo.png')).toBe(
      'https://p.supabase.co/storage/v1/object/public/shop-assets/shops/a/logo.png',
    )
  })

  it('encodes each path segment but keeps the folders', () => {
    expect(shopAssetUrl('https://p.supabase.co', 'shops/a b/logo?.png')).toBe(
      'https://p.supabase.co/storage/v1/object/public/shop-assets/shops/a%20b/logo%3F.png',
    )
  })
})
