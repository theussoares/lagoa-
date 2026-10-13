import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { lapsedCutoff } from '#shared/domain/customer'
import type { CustomerFilter } from '#shared/schemas/customer'
import { appUsers, customerProfiles, loyaltyCards } from '../../database/schema'
import { TEST_DATABASE_URL, TestDatabase, type TestShop } from '../../test-support/test-database'
import type { CustomerPageQuery } from './customers.repository'
import { DrizzleCustomersRepository } from './drizzle-customers.repository'

const SLOW = 30_000
const NOW = new Date('2026-10-10T12:00:00Z')

/** Paginação da tela Clientes no banco de verdade: filtro, contagem e cursor (inclusive empate e visita nula). */
describe.skipIf(!TEST_DATABASE_URL)('merchant customers against a real database', () => {
  let data: TestDatabase
  let repository: DrizzleCustomersRepository
  let shop: TestShop
  let otherShop: TestShop
  const names: Record<string, string> = {}

  /** `lastVisitAt` vai como texto para o Postgres guardar os microssegundos que um `Date` do JS perderia. */
  async function addCard(target: TestShop, name: string, options: { lastVisitAt: string | null; balance?: number; consent?: boolean; erased?: boolean }): Promise<string> {
    const customerId = await data.createCustomer()
    names[customerId] = name
    await data.db.insert(loyaltyCards).values({
      shopId: target.id,
      customerId,
      programId: target.programId,
      balance: options.balance ?? 1,
      lastVisitAt: options.lastVisitAt === null ? null : sql`${options.lastVisitAt}::timestamptz`,
    })
    if (options.consent) await data.db.update(customerProfiles).set({ notificationsConsent: true }).where(eq(customerProfiles.userId, customerId))
    if (options.erased) await data.db.update(appUsers).set({ erasedAt: NOW }).where(eq(appUsers.id, customerId))
    return customerId
  }

  const query = (filter: CustomerFilter, after: string | null, limit: number): CustomerPageQuery => ({
    shopId: shop.id,
    filter,
    lapsedCutoff: lapsedCutoff(NOW),
    after,
    limit,
  })

  async function walk(filter: CustomerFilter, pageSize: number): Promise<string[]> {
    const seen: string[] = []
    let after: string | null = null
    for (let page = 0; page < 20; page += 1) {
      const rows = await repository.listShopCustomers(query(filter, after, pageSize))
      seen.push(...rows.map((row) => names[row.customerId] ?? row.customerId))
      if (rows.length < pageSize) return seen
      after = rows[rows.length - 1]?.customerId ?? null
    }
    throw new Error('pagination did not end')
  }

  beforeAll(async () => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    repository = new DrizzleCustomersRepository(data.db)
    shop = await data.createShop({ rules: { mode: 'stamps', target: 10 } })
    otherShop = await data.createShop()

    await addCard(shop, 'recentReady', { lastVisitAt: '2026-10-09T12:00:00Z', balance: 10, consent: true })
    await addCard(shop, 'lapsed40', { lastVisitAt: '2026-08-31T12:00:00Z', consent: true })
    // Empate exato, com microssegundos: o desempate é o id do cartão.
    await addCard(shop, 'tieA', { lastVisitAt: '2026-08-29T12:00:00.123456Z' })
    await addCard(shop, 'tieB', { lastVisitAt: '2026-08-29T12:00:00.123456Z', consent: true })
    await addCard(shop, 'neverA', { lastVisitAt: null })
    await addCard(shop, 'neverB', { lastVisitAt: null })
    await addCard(shop, 'erased', { lastVisitAt: '2026-10-08T12:00:00Z', erased: true })
    await addCard(otherShop, 'stranger', { lastVisitAt: '2026-10-09T13:00:00Z', balance: 10, consent: true })
  }, SLOW)

  afterAll(async () => data.close())

  it('walks every customer of the shop exactly once, in the single-query order, across pages of 2', async () => {
    const all = (await repository.listShopCustomers(query('all', null, 100))).map((row) => names[row.customerId])
    expect(all).toHaveLength(6)
    expect(all.slice(0, 2)).toEqual(['recentReady', 'lapsed40'])
    expect(new Set(all.slice(2, 4))).toEqual(new Set(['tieA', 'tieB']))
    expect(new Set(all.slice(4))).toEqual(new Set(['neverA', 'neverB']))
    for (const size of [1, 2, 3, 4]) expect(await walk('all', size)).toEqual(all)
  }, SLOW)

  it('filters lapsed and reward-ready in SQL, with the same cutoff as the screen', async () => {
    expect(await walk('lapsed', 2)).toEqual(expect.arrayContaining(['lapsed40', 'tieA', 'tieB']))
    expect(await walk('lapsed', 2)).toHaveLength(3)
    expect(await walk('rewardReady', 2)).toEqual(['recentReady'])
  }, SLOW)

  it('counts the whole filter (not the page) and who accepts notifications, leaving erased accounts out', async () => {
    const scope = { shopId: shop.id, lapsedCutoff: lapsedCutoff(NOW) }
    expect(await repository.countShopCustomers({ ...scope, filter: 'all' })).toEqual({ total: 6, acceptingNotifications: 3 })
    expect(await repository.countShopCustomers({ ...scope, filter: 'lapsed' })).toEqual({ total: 3, acceptingNotifications: 2 })
    expect(await repository.countShopCustomers({ ...scope, filter: 'rewardReady' })).toEqual({ total: 1, acceptingNotifications: 1 })
  }, SLOW)

  it('returns an empty page for a cursor from another shop, never that shop rows', async () => {
    const [stranger] = await repository.listShopCustomers({ ...query('all', null, 1), shopId: otherShop.id })
    if (!stranger) throw new Error('stranger card expected')
    expect(await repository.listShopCustomers(query('all', stranger.customerId, 10))).toEqual([])
  }, SLOW)
})
