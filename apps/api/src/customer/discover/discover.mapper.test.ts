import { describe, expect, it } from 'vitest'
import { discoverShop, NO_BONUS } from './discover.fixtures'
import { toShopSummary } from './discover.mapper'

const SUPABASE_URL = 'https://project.supabase.co'

describe('toShopSummary', () => {
  it('describes a stamp card with no welcome bonus and no image', () => {
    const summary = toShopSummary(discoverShop(), SUPABASE_URL)
    expect(summary.program).toEqual({
      unit: 'stamp',
      target: 10,
      rewardTitle: 'Corte grátis',
      earnRate: { per: 'visit', units: 1 },
      welcomeUnits: 0,
    })
    expect(summary.showcase).toBeUndefined()
  })

  it('counts the welcome units only when that rule is on', () => {
    const shop = discoverShop({
      program: { ...discoverShop().program, bonusRules: { ...NO_BONUS, welcomeBonus: { enabled: true, units: 2 } } },
    })
    expect(toShopSummary(shop, SUPABASE_URL).program.welcomeUnits).toBe(2)
  })

  it('describes points per real', () => {
    const shop = discoverShop({ program: { ...discoverShop().program, mode: 'pointsPerCurrency', earnUnits: 2, target: 200 } })
    expect(toShopSummary(shop, SUPABASE_URL).program).toMatchObject({ unit: 'point', earnRate: { per: 'real', units: 2 } })
  })

  it('builds the logo URL from the stored path, never storing a URL', () => {
    const summary = toShopSummary(discoverShop({ logoPath: 'shops/abc/logo.png' }), SUPABASE_URL)
    expect(summary.showcase?.imageUrl).toBe('https://project.supabase.co/storage/v1/object/public/shop-assets/shops/abc/logo.png')
  })

  it('never exposes the check-in code, the owner or the status', () => {
    const summary = toShopSummary(discoverShop(), SUPABASE_URL)
    expect(Object.keys(summary).sort()).toEqual(['addressLine', 'category', 'id', 'name', 'neighborhood', 'program'])
  })
})
