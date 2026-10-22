import { eq } from 'drizzle-orm'
import { FEATURED_CAROUSEL_MAX } from '#shared/constants/domain'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { featuredPlacements, programs, shops } from '../../database/schema'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { SystemClock } from '../../common/clock'
import { DiscoverService } from './discover.service'
import { DrizzleDiscoverRepository } from './drizzle-discover.repository'

const SLOW = 30_000

describe.skipIf(!TEST_DATABASE_URL)('discover against a real database', () => {
  let data: TestDatabase
  let service: DiscoverService

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new DiscoverService(new DrizzleDiscoverRepository(data.db), { SUPABASE_URL: 'https://project.supabase.co' }, new SystemClock())
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

  describe('featured', () => {
    const NOW = new Date('2026-10-21T15:00:00Z')
    const HOUR = 3_600_000
    const live = { startsAt: new Date(NOW.getTime() - 24 * HOUR), endsAt: new Date(NOW.getTime() + 24 * HOUR) }
    let featuredService: DiscoverService
    let adminId: string

    beforeAll(async () => {
      featuredService = new DiscoverService(new DrizzleDiscoverRepository(data.db), { SUPABASE_URL: 'https://project.supabase.co' }, { now: () => NOW })
      adminId = (await data.createAdminUser()).id
    })

    const place = async (shopId: string, period: { startsAt: Date; endsAt: Date } = live, cancelled = false) => {
      await data.db.insert(featuredPlacements).values({
        shopId,
        surface: 'discoverCarousel',
        createdByAdminId: adminId,
        ...period,
        ...(cancelled && { cancelledAt: NOW, cancelledByAdminId: adminId }),
      })
    }
    const makePro = async (shopId: string) => data.db.update(shops).set({ plan: 'founderPro' }).where(eq(shops.id, shopId))
    const featured = async () => {
      const result = await featuredService.listFeatured()
      return result.ok ? result.value : []
    }

    it('lists paid shops first, then Pro shops, with no repeat and the paid flag', async () => {
      const [paid, paidPro, pro, plain] = [await data.createShop(), await data.createShop(), await data.createShop(), await data.createShop()]
      await makePro(paidPro.id)
      await makePro(pro.id)
      await place(paid.id)
      await place(paidPro.id)
      const list = await featured()
      const ids = list.map((shop) => shop.id)
      expect(ids).toEqual(expect.arrayContaining([paid.id, paidPro.id, pro.id]))
      expect(ids).not.toContain(plain.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.length).toBeLessThanOrEqual(FEATURED_CAROUSEL_MAX)
      const flags = new Map<string, boolean>(list.map((shop) => [shop.id, shop.sponsored]))
      expect(flags.get(paid.id)).toBe(true)
      expect(flags.get(paidPro.id)).toBe(true)
      expect(flags.get(pro.id)).toBe(false)
      const lastPaid = Math.max(...list.flatMap((shop, index) => (shop.sponsored ? [index] : [])))
      const firstPro = list.findIndex((shop) => !shop.sponsored)
      expect(firstPro === -1 || lastPaid < firstPro).toBe(true)
    }, SLOW)

    it('pauses a suspended shop, ignores cancelled and out-of-period placements, and hides a suspended Pro shop', async () => {
      const [suspended, cancelled, future, ended, suspendedPro] = [
        await data.createShop({ status: 'suspended' }),
        await data.createShop(),
        await data.createShop(),
        await data.createShop(),
        await data.createShop({ status: 'suspended' }),
      ]
      await makePro(suspendedPro.id)
      await place(suspended.id)
      await place(cancelled.id, live, true)
      await place(future.id, { startsAt: new Date(NOW.getTime() + HOUR), endsAt: new Date(NOW.getTime() + 9 * HOUR) })
      await place(ended.id, { startsAt: new Date(NOW.getTime() - 9 * HOUR), endsAt: NOW })
      const ids = (await featured()).map((shop) => shop.id)
      for (const hidden of [suspended, cancelled, future, ended, suspendedPro]) expect(ids).not.toContain(hidden.id)
    }, SLOW)

    it('keeps the same order all day and rotates it when the day changes', async () => {
      for (let i = 0; i < 6; i += 1) await makePro((await data.createShop()).id)
      const first = (await featured()).map((shop) => shop.id)
      const again = (await featured()).map((shop) => shop.id)
      expect(again).toEqual(first)
      const repository = new DrizzleDiscoverRepository(data.db)
      const otherDay = (await repository.listFeaturedShops(NOW, '2026-10-22', 50)).map((entry) => entry.shop.id)
      const today = (await repository.listFeaturedShops(NOW, '2026-10-21', 50)).map((entry) => entry.shop.id)
      expect(otherDay.slice().sort()).toEqual(today.slice().sort())
      expect(otherDay).not.toEqual(today)
    }, SLOW)
  })

  it('answers an empty list of challenges (out of the MVP)', async () => {
    expect(await service.listChallenges()).toEqual({ ok: true, value: [] })
  })
})
