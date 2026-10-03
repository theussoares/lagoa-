import { describe, expect, it } from 'vitest'
import { BonusRulesSchema } from '#shared/schemas/program'
import { CheckInCodeSchema, ShopProfileDraftSchema } from '#shared/schemas/shop'
import { toProgramRules } from '../programs/program-rules.mapper'
import { SEED_SHOPS } from './seed-data'

describe('seed data stays valid for the shared contracts', () => {
  it.each(SEED_SHOPS.map((shop) => [shop.name, shop] as const))('%s', (_name, shop) => {
    expect(CheckInCodeSchema.safeParse(shop.checkInCode).success).toBe(true)
    expect(BonusRulesSchema.safeParse(shop.program.bonusRules).success).toBe(true)
    expect(toProgramRules(shop.program).ok).toBe(true)
    expect(ShopProfileDraftSchema.safeParse(shop).success).toBe(true)
  })

  it('has unique check-in codes and ids', () => {
    expect(new Set(SEED_SHOPS.map((shop) => shop.checkInCode)).size).toBe(SEED_SHOPS.length)
    expect(new Set(SEED_SHOPS.map((shop) => shop.id)).size).toBe(SEED_SHOPS.length)
  })
})
