import { randomUUID } from 'node:crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PiiService } from '../../common/pii.service'
import { appUsers, hitItems, ledgerEntries, loyaltyCards, shops, shopStatusEvents } from '../../database/schema'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleAdminShopsRepository } from './drizzle-shops.repository'
import { decodeCursor, encodeCursor, rankOf } from './shops.rules'
import { AdminShopsService } from './shops.service'

const SLOW = 30_000
const PHONE = '67991230374'
const EMAIL = 'dona@example.com'
const pii = new PiiService({ PII_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'), PII_HASH_PEPPER: 'pepper' })

describe.skipIf(!TEST_DATABASE_URL)('admin shops against a real database', () => {
  let data: TestDatabase
  let service: AdminShopsService
  let admin: { adminId: string }

  beforeAll(async () => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new AdminShopsService(new DrizzleAdminShopsRepository(data.db), pii)
    admin = { adminId: (await data.createAdminUser({ name: 'Ana da Rede' })).id }
  })
  afterAll(async () => data.close())

  const ownerOf = async (shopId: string): Promise<string> => {
    const [row] = await data.db.select({ owner: shops.ownerUserId }).from(shops).where(eq(shops.id, shopId))
    if (!row) throw new Error('shop expected')
    return row.owner
  }
  const withPhone = async (shopId: string): Promise<void> => {
    await data.db.update(appUsers).set({ phoneEncrypted: pii.encrypt(PHONE), emailEncrypted: pii.encryptEmail(EMAIL) }).where(eq(appUsers.id, await ownerOf(shopId)))
  }
  /** Loja de teste com o dono cifrado como no cadastro real (o fixture padrão grava bytes soltos). */
  const newShop = async (options: Parameters<TestDatabase['createShop']>[0] = {}) => {
    const shop = await data.createShop(options)
    await withPhone(shop.id)
    return shop
  }
  const detail = async (shopId: string) => {
    const result = await service.detail(shopId)
    if (!result.ok) throw new Error('detail expected')
    return result.value
  }

  it('approves a pending shop and records the admin on the event', async () => {
    const shop = await newShop({ status: 'pending' })
    const result = await service.act(admin, shop.id, { action: 'approve' })
    expect(result).toMatchObject({ ok: true, value: { id: shop.id, status: 'approved' } })
    const events = await data.db.select().from(shopStatusEvents).where(eq(shopStatusEvents.shopId, shop.id))
    expect(events).toMatchObject([{ fromStatus: 'pending', toStatus: 'approved', actor: 'admin', actorAdminId: admin.adminId, reason: null }])
    expect((await detail(shop.id)).history).toMatchObject([{ toStatus: 'approved', actorName: 'Ana da Rede' }])
  }, SLOW)

  it('suspends with the reason, reactivates, and refuses actions that do not fit', async () => {
    const shop = await newShop({ status: 'approved' })
    expect(await service.act(admin, shop.id, { action: 'approve' })).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await service.act(admin, shop.id, { action: 'reactivate' })).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await service.act(admin, shop.id, { action: 'suspend', reason: 'denuncia' })).toMatchObject({ ok: true, value: { status: 'suspended' } })
    expect(await service.act(admin, shop.id, { action: 'suspend', reason: 'denuncia' })).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await service.act(admin, shop.id, { action: 'reactivate' })).toMatchObject({ ok: true, value: { status: 'approved' } })
    const events = await data.db.select({ to: shopStatusEvents.toStatus, reason: shopStatusEvents.reason }).from(shopStatusEvents).where(eq(shopStatusEvents.shopId, shop.id))
    expect(events).toHaveLength(2)
    expect(events).toEqual(expect.arrayContaining([{ to: 'suspended', reason: 'denuncia' }, { to: 'approved', reason: null }]))
  }, SLOW)

  it('refuses to approve a suspended shop and answers notFound for an unknown one', async () => {
    const shop = await newShop({ status: 'suspended' })
    expect(await service.act(admin, shop.id, { action: 'approve' })).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await service.act(admin, randomUUID(), { action: 'approve' })).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
    expect(await service.detail(randomUUID())).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
  }, SLOW)

  it('changes the plan without touching the Hits items, and refuses the plan it already has', async () => {
    const shop = await newShop({ status: 'approved' })
    await data.createHitItem(shop.id, { title: 'Um' })
    await data.createHitItem(shop.id, { title: 'Dois', status: 'approved' })
    const before = await data.db.select().from(hitItems).where(eq(hitItems.shopId, shop.id))

    expect(await service.act(admin, shop.id, { action: 'changePlan', plan: 'founderPro' })).toMatchObject({ ok: true, value: { plan: 'founderPro', status: 'approved' } })
    expect(await data.db.select().from(hitItems).where(eq(hitItems.shopId, shop.id))).toEqual(before)
    expect(await service.act(admin, shop.id, { action: 'changePlan', plan: 'founder' })).toMatchObject({ ok: true, value: { plan: 'founder' } })
    expect(await service.act(admin, shop.id, { action: 'changePlan', plan: 'founder' })).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await data.db.select().from(hitItems).where(eq(hitItems.shopId, shop.id))).toEqual(before)
  }, SLOW)

  it('returns the decrypted owner, program, aggregates and history in the detail', async () => {
    const shop = await newShop({ status: 'approved' })
    const [first, second] = [await data.createCustomer(), await data.createCustomer()]
    const cards = await data.db
      .insert(loyaltyCards)
      .values([first, second].map((customerId) => ({ shopId: shop.id, customerId, programId: shop.programId })))
      .returning({ id: loyaltyCards.id, customerId: loyaltyCards.customerId })
    const day = 24 * 3_600_000
    const entry = (cardIndex: number, ageDays: number, extra: Partial<typeof ledgerEntries.$inferInsert>): typeof ledgerEntries.$inferInsert => ({
      cardId: cards[cardIndex]?.id ?? '',
      shopId: shop.id,
      customerId: cards[cardIndex]?.customerId ?? '',
      kind: 'visit',
      unitsDelta: 1,
      countsAsVisit: true,
      idempotencyKey: randomUUID(),
      occurredAt: new Date(Date.now() - ageDays * day),
      ...extra,
    })
    await data.db.insert(ledgerEntries).values([
      entry(0, 1, {}),
      entry(0, 29, { kind: 'checkIn' }),
      entry(1, 31, {}),
      entry(1, 2, { kind: 'welcomeBonus', countsAsVisit: false }),
    ])

    expect(await detail(shop.id)).toMatchObject({
      id: shop.id,
      addressLine: 'Rua de teste, 1',
      owner: { phone: PHONE, email: EMAIL },
      program: { rewardTitle: 'Prêmio de teste', mode: 'stamps', target: 10 },
      stats: { customers: 2, visitsLast30Days: 2 },
      history: [],
    })
  }, SLOW)

  it('has a null email for a phone-only owner and a null owner for an erased account', async () => {
    const shop = await newShop()
    await data.db.update(appUsers).set({ phoneEncrypted: pii.encrypt(PHONE), emailEncrypted: null }).where(eq(appUsers.id, await ownerOf(shop.id)))
    expect((await detail(shop.id)).owner).toEqual({ phone: PHONE, email: null })
    await data.db.update(appUsers).set({ phoneEncrypted: Buffer.alloc(0), erasedAt: new Date() }).where(eq(appUsers.id, await ownerOf(shop.id)))
    expect((await detail(shop.id)).owner).toBeNull()
  }, SLOW)

  it('keeps the owner contact out of the list rows', async () => {
    await newShop()
    const page = await service.list({})
    expect(page.shops.length).toBeGreaterThan(0)
    expect(JSON.stringify(page)).not.toContain(PHONE)
    expect(JSON.stringify(page)).not.toContain(EMAIL)
  }, SLOW)

  describe('list order and paging', () => {
    const tag = `Zz${randomUUID().slice(0, 8)}`
    let ids: string[] = []

    beforeAll(async () => {
      // 4 aprovadas e 3 pendentes, com datas fora de ordem e duas com o mesmo `created_at` (o `id` desempata).
      const specs = [
        { status: 'approved', at: '2026-03-01T10:00:00.000123Z' },
        { status: 'pending', at: '2026-01-01T10:00:00Z' },
        { status: 'approved', at: '2026-03-05T10:00:00Z' },
        { status: 'pending', at: '2026-02-01T10:00:00Z' },
        { status: 'approved', at: '2026-03-05T10:00:00Z' },
        { status: 'suspended', at: '2026-03-03T10:00:00Z' },
        { status: 'pending', at: '2026-02-01T10:00:00Z' },
      ] as const
      ids = []
      for (const [index, spec] of specs.entries()) {
        const shop = await newShop({ status: spec.status })
        await data.db.execute(
          sql`update shops set name = ${`${tag} ${index}`}, created_at = ${spec.at}::timestamptz where id = ${shop.id}`,
        )
        ids.push(shop.id)
      }
    })

    const walk = async (query: { status?: 'pending' | 'approved' | 'suspended' }): Promise<string[]> => {
      const seen: string[] = []
      let cursor: string | undefined
      for (let page = 0; page < 20; page += 1) {
        const result = await service.list({ q: tag, ...query, ...(cursor !== undefined && { cursor }) })
        seen.push(...result.shops.map((shop) => shop.id))
        if (result.nextCursor === null) break
        cursor = result.nextCursor
      }
      return seen
    }

    it('puts pending first, then newest first, with the id breaking ties', async () => {
      const all = (await service.list({ q: tag })).shops
      expect(all).toHaveLength(7)
      expect(all.map((shop) => shop.status)).toEqual(['pending', 'pending', 'pending', 'approved', 'approved', 'suspended', 'approved'])
      const pending = all.slice(0, 3)
      expect(pending.map((shop) => shop.createdAt)).toEqual(['2026-02-01T10:00:00.000Z', '2026-02-01T10:00:00.000Z', '2026-01-01T10:00:00.000Z'])
      expect(pending[0]?.id.localeCompare(pending[1]?.id ?? '')).toBeGreaterThan(0)
      expect(all.slice(3).map((shop) => shop.createdAt)).toEqual([
        '2026-03-05T10:00:00.000Z',
        '2026-03-05T10:00:00.000Z',
        '2026-03-03T10:00:00.000Z',
        '2026-03-01T10:00:00.000Z',
      ])
    }, SLOW)

    it('the pages, walked through the cursor, add up to the whole list with no gap and no repeat', async () => {
      const whole = (await service.list({ q: tag })).shops.map((shop) => shop.id)
      // Pagina de 1 em 1 pelo repository (a página do service é 50): mesma consulta, limite pequeno.
      const repository = new DrizzleAdminShopsRepository(data.db)
      const walked: string[] = []
      let after: ReturnType<typeof decodeCursor> | null = null
      for (let page = 0; page < 10; page += 1) {
        const rows = await repository.list({ status: null, name: tag, after, limit: 2 })
        if (rows.length === 0) break
        walked.push(...rows.map((row) => row.id))
        const last = rows[rows.length - 1]
        if (last === undefined) break
        after = decodeCursor(encodeCursor({ rank: rankOf(last.status), id: last.id }))
      }
      expect(walked).toEqual(whole)
      expect(new Set(walked).size).toBe(7)
    }, SLOW)

    it('loses no shop when the one on the cursor is approved between two pages (it only reappears in its new place)', async () => {
      const repository = new DrizzleAdminShopsRepository(data.db)
      const whole = (await service.list({ q: tag })).shops
      const firstPage = await repository.list({ status: null, name: tag, after: null, limit: 2 })
      const last = firstPage[1]
      if (last === undefined) throw new Error('page expected')
      const cursor = encodeCursor({ rank: rankOf(last.status), id: last.id })
      await service.act(admin, last.id, { action: 'approve' })
      const second = await repository.list({ status: null, name: tag, after: decodeCursor(cursor), limit: 50 })
      expect(second.map((row) => row.id).filter((id) => id !== last.id)).toEqual(whole.slice(2).map((shop) => shop.id))
      expect(second.some((row) => row.id === last.id && row.status === 'approved')).toBe(true)
    }, SLOW)

    it('filters by status and by name (case-insensitive, wildcards are plain text)', async () => {
      expect(await walk({ status: 'suspended' })).toHaveLength(1)
      expect((await service.list({ q: tag.toLowerCase() })).shops).toHaveLength(7)
      expect((await service.list({ q: `${tag}%` })).shops).toHaveLength(0)
      expect((await service.list({ q: '100%_\\' })).shops).toEqual([])
    }, SLOW)

    it('answers an empty page for a cursor from a shop that does not exist', async () => {
      expect((await service.list({ q: tag, cursor: `1:${randomUUID()}` })).shops).toEqual([])
    }, SLOW)

    it('cleans up', async () => {
      await data.db.delete(shopStatusEvents).where(inArray(shopStatusEvents.shopId, ids))
    })
  })
})
