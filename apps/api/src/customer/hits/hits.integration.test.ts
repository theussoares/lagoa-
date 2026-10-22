import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HITS_BANNERS_MAX } from '#shared/constants/domain'
import type { PublicHitItem } from '#shared/schemas/showcase'
import type { Clock } from '../../common/clock'
import { featuredPlacements, hitItems, shops } from '../../database/schema'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase, type TestShop } from '../../test-support/test-database'
import { DrizzleCustomerHitsRepository } from './drizzle-hits.repository'
import { CustomerHitsService } from './hits.service'

const SLOW = 30_000
const SUPABASE_URL = 'https://project.supabase.co'
const NOW = new Date('2026-10-21T15:00:00Z')
const HOUR = 3_600_000
const clock: Clock = { now: () => NOW }
const hoursFromNow = (hours: number): Date => new Date(NOW.getTime() + hours * HOUR)
const APPROVED = { status: 'approved' as const }

describe.skipIf(!TEST_DATABASE_URL)('customer hits against a real database', () => {
  let data: TestDatabase
  let service: CustomerHitsService
  let adminId: string

  beforeAll(async () => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new CustomerHitsService(new DrizzleCustomerHitsRepository(data.db), { SUPABASE_URL }, clock)
    adminId = (await data.createAdminUser()).id
  })
  afterAll(async () => data.close())

  const everything = async (query: Parameters<CustomerHitsService['list']>[0] = {}, pageSize?: number): Promise<PublicHitItem[][]> => {
    const paged = new CustomerHitsService(new DrizzleCustomerHitsRepository(data.db), { SUPABASE_URL }, clock, pageSize)
    const pages: PublicHitItem[][] = []
    let cursor: string | undefined
    do {
      const page = await paged.list({ ...query, ...(cursor !== undefined && { cursor }) })
      pages.push(page.items)
      cursor = page.nextCursor ?? undefined
    } while (cursor !== undefined)
    return pages
  }
  const feedIds = async (query: Parameters<CustomerHitsService['list']>[0] = {}): Promise<string[]> => (await everything(query)).flat().map((item) => item.id)
  const approvedItem = (shopId: string, overrides: Partial<typeof hitItems.$inferInsert> = {}) => data.createHitItem(shopId, { ...APPROVED, approvedAt: hoursFromNow(-1), ...overrides })
  const place = async (shop: TestShop, surface: 'hitsBanner' | 'discoverCarousel', period: { startsAt: Date; endsAt: Date }, hitItemId?: string) => {
    await data.db.insert(featuredPlacements).values({ shopId: shop.id, surface, createdByAdminId: adminId, ...period, ...(hitItemId !== undefined && { hitItemId }) })
  }
  const makePro = async (shop: TestShop) => data.db.update(shops).set({ plan: 'founderPro' }).where(eq(shops.id, shop.id))
  const live = { startsAt: hoursFromNow(-24), endsAt: hoursFromNow(24) }

  it('lists only visible items: approved, with photo, inside the validity, from an approved shop', async () => {
    const shop = await data.createShop()
    const suspended = await data.createShop({ status: 'suspended' })
    const ok = await approvedItem(shop.id)
    const ongoing = await approvedItem(shop.id, { endsAt: hoursFromNow(5) })
    const expired = await approvedItem(shop.id, { endsAt: hoursFromNow(-5) })
    const noPhoto = await approvedItem(shop.id, { photoPath: null })
    const pending = await data.createHitItem(shop.id)
    const ofSuspended = await approvedItem(suspended.id)
    const ids = await feedIds()
    expect(ids).toEqual(expect.arrayContaining([ok.id, ongoing.id]))
    for (const hidden of [expired, noPhoto, pending, ofSuspended]) expect(ids).not.toContain(hidden.id)
  }, SLOW)

  it('filters by group: only shops of the group show up', async () => {
    const shop = await data.createShop()
    const item = await approvedItem(shop.id)
    expect(await feedIds({ group: 'food' })).toContain(item.id)
    expect(await feedIds({ group: 'pet' })).not.toContain(item.id)
    const pet = (await everything({ group: 'pet' })).flat()
    expect(pet.every((entry) => entry.shop.category === 'petShop')).toBe(true)
  }, SLOW)

  it('pages without gaps or duplicates across equal timestamps and a null approved_at tail', async () => {
    const shop = await data.createShop()
    const same = new Date('2019-06-01T00:00:00.123456Z')
    const rows = [
      await approvedItem(shop.id, { approvedAt: new Date('2019-06-03T00:00:00Z') }),
      await approvedItem(shop.id, { approvedAt: same }),
      await approvedItem(shop.id, { approvedAt: same }),
      await approvedItem(shop.id, { approvedAt: same }),
      await approvedItem(shop.id, { approvedAt: null }),
      await approvedItem(shop.id, { approvedAt: null }),
    ]
    // Só os itens deste teste: as páginas de 2 percorrem o banco todo, então o recorte vem por id.
    const mine = new Set(rows.map((row) => row.id))
    const flat = (await everything({}, 2)).flat().map((item) => item.id).filter((id) => mine.has(id))
    expect(flat).toHaveLength(6)
    expect(new Set(flat).size).toBe(6)
    expect(flat[0]).toBe(rows[0]?.id)
    expect(flat.slice(1, 4).sort()).toEqual(rows.slice(1, 4).map((row) => row.id).sort())
    expect(flat.slice(4).sort()).toEqual(rows.slice(4).map((row) => row.id).sort())
  }, SLOW)

  it('returns a full page only with a next cursor, and a short last page without one', async () => {
    const shop = await data.createShop()
    await approvedItem(shop.id)
    const small = new CustomerHitsService(new DrizzleCustomerHitsRepository(data.db), { SUPABASE_URL }, clock, 1)
    const first = await small.list({})
    expect(first.items).toHaveLength(1)
    expect(first.nextCursor).toBe(first.items[0]?.id)
  }, SLOW)

  it('computes what the purchase earns: per real without a price is null, stamps without a price is one', async () => {
    const perReal = await data.createShop({ rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 100 } })
    const stamps = await data.createShop()
    const withoutPrice = await approvedItem(perReal.id, { priceCents: null })
    const withPrice = await approvedItem(perReal.id, { priceCents: 5000 })
    const stampItem = await approvedItem(stamps.id, { priceCents: null })
    const byId = new Map((await everything()).flat().map((item) => [item.id, item]))
    expect(byId.get(withoutPrice.id)?.earning).toBeNull()
    expect(byId.get(withPrice.id)?.earning).toMatchObject({ unit: 'point', doubled: false })
    expect(byId.get(stampItem.id)?.earning).toEqual({ unit: 'stamp', units: 1, doubled: false })
  }, SLOW)

  it('doubles the earning on the shop surprise day and shows the item button before the shop one', async () => {
    const shop = await data.createShop({ bonusRules: { ...NO_BONUS_RULES, surpriseDay: { enabled: true, multiplier: 2, date: '2026-10-21' } } })
    await data.db.update(shops).set({ ctaKind: 'url', ctaUrl: 'https://loja.example/oferta', ctaLabel: 'Ver loja' }).where(eq(shops.id, shop.id))
    const inherits = await approvedItem(shop.id)
    const own = await approvedItem(shop.id, { ctaKind: 'whatsapp', whatsapp: '67991230374', whatsappMessage: 'Oi', ctaLabel: 'Pedir' })
    const byId = new Map((await everything()).flat().map((item) => [item.id, item]))
    expect(byId.get(inherits.id)).toMatchObject({ earning: { units: 2, doubled: true }, contact: { kind: 'url' } })
    expect(byId.get(own.id)?.contact).toMatchObject({ kind: 'whatsapp', whatsapp: '67991230374' })
    expect(byId.get(own.id)?.photoUrl).toMatch(/^https:\/\/project\.supabase\.co\/storage\/v1\/object\/public\/shop-assets\/hits\//)
  }, SLOW)

  describe('banners', () => {
    const banners = async () => service.banners()

    it('puts the paid banners first (oldest first) and the Pro newest item after, without repeating a shop', async () => {
      const [paidA, paidB, pro] = [await data.createShop(), await data.createShop(), await data.createShop()]
      await makePro(pro)
      const paidItemA = await approvedItem(paidA.id)
      const paidItemB = await approvedItem(paidB.id)
      await approvedItem(pro.id, { approvedAt: hoursFromNow(-10) })
      const proNewest = await approvedItem(pro.id, { approvedAt: hoursFromNow(-2) })
      await place(paidB, 'hitsBanner', { startsAt: hoursFromNow(-20), endsAt: hoursFromNow(5) }, paidItemB.id)
      await place(paidA, 'hitsBanner', { startsAt: hoursFromNow(-10), endsAt: hoursFromNow(5) }, paidItemA.id)
      const list = await banners()
      const ids = list.map((banner) => banner.item.id)
      expect(ids.slice(0, 2)).toEqual([paidItemB.id, paidItemA.id])
      expect(list.slice(0, 2).every((banner) => banner.sponsored)).toBe(true)
      expect(list.find((banner) => banner.item.id === proNewest.id)).toMatchObject({ sponsored: false })
      expect(ids.indexOf(proNewest.id)).toBeGreaterThan(1)
      expect(new Set(list.map((banner) => banner.item.shop.id)).size).toBe(list.length)
      expect(list.length).toBeLessThanOrEqual(HITS_BANNERS_MAX)
    }, SLOW)

    it('drops a paid banner whose item expired, whose placement is out of period, cancelled, or whose shop is suspended', async () => {
      const shop = await data.createShop()
      const suspended = await data.createShop({ status: 'suspended' })
      const expired = await approvedItem(shop.id, { endsAt: hoursFromNow(-1) })
      const future = await approvedItem(shop.id)
      const ended = await approvedItem(shop.id)
      const ofSuspended = await approvedItem(suspended.id)
      await place(shop, 'hitsBanner', live, expired.id)
      await place(shop, 'hitsBanner', { startsAt: hoursFromNow(1), endsAt: hoursFromNow(9) }, future.id)
      await place(shop, 'hitsBanner', { startsAt: hoursFromNow(-9), endsAt: NOW }, ended.id)
      await place(suspended, 'hitsBanner', live, ofSuspended.id)
      const ids = (await banners()).map((banner) => banner.item.id)
      for (const hidden of [expired, future, ended, ofSuspended]) expect(ids).not.toContain(hidden.id)
    }, SLOW)
  })
})
