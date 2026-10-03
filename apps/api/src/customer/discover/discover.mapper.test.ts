import { describe, expect, it } from 'vitest'
import type { ShopSummary } from '#shared/schemas/shop'
import { SHOP_NAME_MAX_LENGTH } from '#shared/constants/domain'
import { discoverShop, NO_BONUS } from './discover.fixtures'
import { toShopSummary } from './discover.mapper'

const SUPABASE_URL = 'https://project.supabase.co'

function summaryOf(shop = discoverShop()): ShopSummary {
  const result = toShopSummary(shop, SUPABASE_URL)
  if (!result.ok) throw new Error('expected a valid summary')
  return result.value
}

describe('toShopSummary', () => {
  it('describes a stamp card with no welcome bonus and no image', () => {
    const summary = summaryOf()
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
    const base = discoverShop().program
    const shop = discoverShop({ program: { ...base, bonusRules: { ...NO_BONUS, welcomeBonus: { enabled: true, units: 2 } } } })
    expect(summaryOf(shop).program.welcomeUnits).toBe(2)
  })

  it('describes points per real', () => {
    const base = discoverShop().program
    const shop = discoverShop({ program: { ...base, rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 200 } } })
    expect(summaryOf(shop).program).toMatchObject({ unit: 'point', target: 200, earnRate: { per: 'real', units: 2 } })
  })

  it('builds the logo URL from the stored path, never storing a URL', () => {
    expect(summaryOf(discoverShop({ logoPath: 'shops/abc/logo.png' })).showcase?.imageUrl).toBe(
      'https://project.supabase.co/storage/v1/object/public/shop-assets/shops/abc/logo.png',
    )
  })

  it('drops fields the app must never see even if the row carries them', () => {
    const leaky = { ...discoverShop(), checkInCode: 'NAV4K7', ownerUserId: 'owner-1', status: 'approved' }
    const summary = summaryOf(leaky)
    expect(Object.keys(summary).sort()).toEqual(['addressLine', 'category', 'id', 'name', 'neighborhood', 'program'])
  })

  it('refuses a shop that breaks the contract (name too long) instead of throwing', () => {
    const shop = discoverShop({ name: 'x'.repeat(SHOP_NAME_MAX_LENGTH + 1) })
    expect(toShopSummary(shop, SUPABASE_URL)).toEqual({ ok: false, error: { code: 'invalidProgram' } })
  })
})
