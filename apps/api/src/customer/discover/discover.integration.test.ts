import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { programs } from '../../database/schema'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DiscoverService } from './discover.service'
import { DrizzleDiscoverRepository } from './drizzle-discover.repository'

const SLOW = 30_000

describe.skipIf(!TEST_DATABASE_URL)('discover against a real database', () => {
  let data: TestDatabase
  let service: DiscoverService

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new DiscoverService(new DrizzleDiscoverRepository(data.db), { SUPABASE_URL: 'https://project.supabase.co' })
  })

  afterAll(async () => data.close())

  const idsListed = async (): Promise<string[]> => {
    const result = await service.listShops()
    return result.ok ? result.value.map((shop) => shop.id) : []
  }

  it('lists approved shops only, never a pending or suspended one', async () => {
    const [approved, pending, suspended] = [await data.createShop(), await data.createShop({ status: 'pending' }), await data.createShop({ status: 'suspended' })]
    const listed = await idsListed()
    expect(listed).toContain(approved.id)
    expect(listed).not.toContain(pending.id)
    expect(listed).not.toContain(suspended.id)
  }, SLOW)

  it('describes the club of each shop and exposes nothing private', async () => {
    const shop = await data.createShop({ rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 }, bonusRules: { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } } })
    const result = await service.listShops()
    const summary = result.ok ? result.value.find((s) => s.id === shop.id) : undefined
    expect(summary?.program).toEqual({ unit: 'point', target: 100, rewardTitle: 'Prêmio de teste', earnRate: { per: 'visit', units: 10 }, welcomeUnits: 2 })
    expect(JSON.stringify(summary)).not.toContain(shop.checkInCode)
  }, SLOW)

  it('leaves out a shop whose stored bonus rules are broken instead of failing the list', async () => {
    const [good, broken] = [await data.createShop(), await data.createShop()]
    await data.db.update(programs).set({ bonusRules: JSON.parse('{"nope":true}') }).where(eq(programs.shopId, broken.id))
    const listed = await idsListed()
    expect(listed).toContain(good.id)
    expect(listed).not.toContain(broken.id)
  }, SLOW)

  it('answers an empty list of challenges (out of the MVP)', async () => {
    expect(await service.listChallenges()).toEqual({ ok: true, value: [] })
  })
})
