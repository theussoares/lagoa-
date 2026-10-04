import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RANKING_TOP_SIZE } from '#shared/constants/domain'
import { SystemClock } from '../../common/clock'
import { LedgerStore } from '../../ledger/ledger.store'
import { neverExpires, TEST_DATABASE_URL, TestDatabase, type TestShop } from '../../test-support/test-database'
import { DrizzleRankingRepository } from './drizzle-ranking.repository'
import { RankingService } from './ranking.service'

const SLOW = 60_000

describe.skipIf(!TEST_DATABASE_URL)('ranking against a real database', () => {
  let data: TestDatabase
  let service: RankingService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new RankingService(new DrizzleRankingRepository(data.db), new SystemClock())
  })

  afterAll(async () => data.close())

  async function visits(shop: TestShop, customerId: string, total: number): Promise<void> {
    await data.db.transaction(async (tx) => {
      const { card } = await ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId, programId: shop.programId }, neverExpires())
      for (let i = 0; i < total; i += 1) {
        await ledger.credit(tx, {
          card,
          shopId: shop.id,
          customerId,
          kind: 'visit',
          now: new Date(Date.now() - (total - i) * 1000),
          idempotencyKey: `rank-${customerId}-${i}`,
          plan: { welcomeUnits: 0, units: 1, appliedBonuses: [], balanceAfter: i + 1, rewardExpiresAt: null },
        })
      }
    })
  }

  it('lists only people who opted in, with a nickname, ordered by visits this month', async () => {
    const shop = await data.createShop()
    const [ana, bia, caio, hidden] = await Promise.all([data.createCustomer(), data.createCustomer(), data.createCustomer(), data.createCustomer()])
    await visits(shop, ana, 2)
    await visits(shop, bia, 3)
    await visits(shop, caio, 1)
    await visits(shop, hidden, 9)
    for (const [id, name] of [[ana, 'Ana'], [bia, 'Bia'], [caio, 'Caio']] as const) await service.setConsent(id, { granted: true, name })

    const ranking = await service.get(ana)
    expect(ranking.ok && ranking.value.entries.map((e) => `${e.position}:${e.name}:${e.visits}:${e.isMe}`)).toEqual(['1:Bia:3:false', '2:Ana:2:true', '3:Caio:1:false'])
    expect(ranking.ok && ranking.value.me).toEqual({ optedIn: true, position: 2, visits: 2, name: 'Ana' })

    const outside = await service.get(hidden)
    expect(outside.ok && outside.value.me).toEqual({ optedIn: false, position: null, visits: 9, name: null })
    expect(JSON.stringify(outside)).not.toContain(hidden)
  }, SLOW)

  it('leaving erases the nickname and the person disappears from the list', async () => {
    const shop = await data.createShop()
    const customer = await data.createCustomer()
    await visits(shop, customer, 1)
    await service.setConsent(customer, { granted: true, name: 'Zeca' })
    const left = await service.setConsent(customer, { granted: false })
    expect(left.ok && left.value.me).toEqual({ optedIn: false, position: null, visits: 1, name: null })
    expect(left.ok && left.value.entries.some((e) => e.name === 'Zeca')).toBe(false)
  }, SLOW)

  it('shows the requester position even when outside the top list', async () => {
    const shop = await data.createShop()
    const people = await Promise.all(Array.from({ length: RANKING_TOP_SIZE + 2 }, () => data.createCustomer()))
    for (const [index, id] of people.entries()) {
      await visits(shop, id, 50 - index)
      await service.setConsent(id, { granted: true, name: `P${index}` })
    }
    const last = people[people.length - 1] ?? ''
    const ranking = await service.get(last)
    expect(ranking.ok && ranking.value.entries).toHaveLength(RANKING_TOP_SIZE)
    expect(ranking.ok && ranking.value.me.position).toBe(people.length)
  }, SLOW)

  it('answers notFound for a login with no customer profile', async () => {
    const ghost = await data.createCustomer({ withProfile: false })
    expect(await service.get(ghost)).toEqual({ ok: false, error: { code: 'notFound', entity: 'customer' } })
    expect(await service.setConsent(ghost, { granted: true, name: 'Fantasma' })).toEqual({ ok: false, error: { code: 'notFound', entity: 'customer' } })
  }, SLOW)
})
