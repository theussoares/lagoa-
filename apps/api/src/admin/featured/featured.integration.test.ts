import { randomInt } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FEATURED_PAID_SLOTS_DISCOVER, FEATURED_PAID_SLOTS_HITS } from '#shared/constants/domain'
import type { FeaturedPlacementDraft } from '#shared/schemas/featured'
import { ShopIdSchema } from '#shared/schemas/ids'
import { addDays, localDateParts } from '#shared/utils/time'
import { featuredPlacements, shops } from '../../database/schema'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleAdminFeaturedRepository } from './drizzle-featured.repository'
import { AdminFeaturedService } from './featured.service'

const SLOW = 30_000

describe.skipIf(!TEST_DATABASE_URL)('admin featured against a real database', () => {
  let data: TestDatabase
  let service: AdminFeaturedService
  let admin: { adminId: string }
  let otherAdmin: { adminId: string }

  beforeAll(async () => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new AdminFeaturedService(new DrizzleAdminFeaturedRepository(data.db))
    admin = { adminId: (await data.createAdminUser({ name: 'Ana da Rede' })).id }
    otherAdmin = { adminId: (await data.createAdminUser({ name: 'Bia da Rede' })).id }
  })
  afterAll(async () => data.close())

  /**
   * As vagas são da rede inteira: cada teste usa um mês só dele, num futuro distante e sorteado, para não dividir vaga
   * com outro teste nem com linhas que já estejam no banco. Começa à meia-noite local (04:00 UTC).
   */
  const freshMonth = (): Date => new Date(Date.UTC(2200 + randomInt(0, 700), randomInt(0, 12), 1, 4))
  const draft = (shopId: string, startsAt: Date, endsAt: Date, overrides: Partial<FeaturedPlacementDraft> = {}): FeaturedPlacementDraft => ({
    shopId: ShopIdSchema.parse(shopId),
    surface: 'discoverCarousel',
    hitItemId: null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    note: null,
    ...overrides,
  })
  const fill = async (start: Date, days: number, count: number, surface: 'discoverCarousel' | 'hitsBanner' = 'discoverCarousel') => {
    for (let index = 0; index < count; index += 1) {
      const shop = await data.createShop()
      const hitItemId = surface === 'hitsBanner' ? (await data.createHitItem(shop.id, { status: 'approved' })).id : null
      const created = await service.create(admin, draft(shop.id, start, addDays(start, days), { surface, hitItemId }))
      if (!created.ok) throw new Error(`fill failed: ${created.error.code}`)
    }
  }

  it('creates a placement with who launched it, and lists it in the window', async () => {
    const start = freshMonth()
    const shop = await data.createShop()
    const created = await service.create(admin, draft(shop.id, start, addDays(start, 3), { note: 'Venda 12' }))
    expect(created).toMatchObject({ ok: true, value: { shop: { id: shop.id, name: 'Loja de teste' }, note: 'Venda 12', createdBy: { name: 'Ana da Rede' }, cancelledAt: null } })
    const list = await service.list({ surface: 'discoverCarousel', from: localDateParts(start).isoDate, to: localDateParts(addDays(start, 1)).isoDate })
    expect(list.placements.map((placement) => placement.id)).toContain(created.ok ? created.value.id : '')
  }, SLOW)

  it('refuses a period with all Discover slots taken and accepts the half-open next day', async () => {
    const start = freshMonth()
    await fill(start, 10, FEATURED_PAID_SLOTS_DISCOVER)
    const shop = await data.createShop()
    expect(await service.create(admin, draft(shop.id, addDays(start, 5), addDays(start, 6)))).toEqual({ ok: false, error: { code: 'slotsFull' } })
    expect((await service.create(admin, draft(shop.id, addDays(start, 10), addDays(start, 15)))).ok).toBe(true)
  }, SLOW)

  it('gives exactly one of two concurrent creates the last slot', async () => {
    const start = freshMonth()
    await fill(start, 10, FEATURED_PAID_SLOTS_DISCOVER - 1)
    const [first, second] = [await data.createShop(), await data.createShop()]
    // Um `SHARE` na tabela deixa ler e segura todo INSERT: sem o lock da vitrine, as duas leriam a vaga livre antes de
    // qualquer uma gravar. Com ele, a segunda espera a primeira terminar e já a vê.
    // O `racing` sai embrulhado: devolver a promessa direto faria a transação esperar por ela antes de soltar o lock.
    const { racing } = await data.db.transaction(async (tx) => {
      await tx.execute(sql`lock table ${featuredPlacements} in share mode`)
      const pending = Promise.all([
        service.create(admin, draft(first.id, addDays(start, 2), addDays(start, 4))),
        service.create(admin, draft(second.id, addDays(start, 3), addDays(start, 5))),
      ])
      await sleep(500)
      return { racing: pending }
    })
    const results = await racing
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, error: { code: 'slotsFull' } }])
  }, SLOW)

  it('frees the slot when a placement is cancelled, recording who cancelled; a second cancel is invalidTransition', async () => {
    const start = freshMonth()
    await fill(start, 10, FEATURED_PAID_SLOTS_DISCOVER - 1)
    const shop = await data.createShop()
    const last = await service.create(admin, draft(shop.id, start, addDays(start, 10)))
    if (!last.ok) throw new Error('last slot expected')
    const late = await data.createShop()
    expect(await service.create(admin, draft(late.id, addDays(start, 1), addDays(start, 2)))).toEqual({ ok: false, error: { code: 'slotsFull' } })

    const cancelled = await service.cancel(otherAdmin, last.value.id)
    expect(cancelled).toMatchObject({ ok: true, value: { id: last.value.id, cancelledBy: { name: 'Bia da Rede' } } })
    expect(cancelled.ok && cancelled.value.cancelledAt).not.toBe(null)
    expect(await service.cancel(admin, last.value.id)).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect((await service.create(admin, draft(late.id, addDays(start, 1), addDays(start, 2)))).ok).toBe(true)
  }, SLOW)

  it('answers notFound for an unknown placement and an unknown shop', async () => {
    const unknown = '0190a000-0000-7000-8000-0000000fffff'
    expect(await service.cancel(admin, unknown)).toEqual({ ok: false, error: { code: 'notFound', entity: 'featuredPlacement' } })
    const start = freshMonth()
    expect(await service.create(admin, draft(unknown, start, addDays(start, 1)))).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
  }, SLOW)

  it('keeps a suspended shop in its paid slot, but refuses a new placement for it', async () => {
    const start = freshMonth()
    await fill(start, 10, FEATURED_PAID_SLOTS_DISCOVER - 1)
    const shop = await data.createShop()
    expect((await service.create(admin, draft(shop.id, start, addDays(start, 10)))).ok).toBe(true)
    await data.db.update(shops).set({ status: 'suspended' }).where(eq(shops.id, shop.id))
    const other = await data.createShop()
    expect(await service.create(admin, draft(other.id, addDays(start, 1), addDays(start, 2)))).toEqual({ ok: false, error: { code: 'slotsFull' } })
    expect(await service.create(admin, draft(shop.id, addDays(start, 20), addDays(start, 21)))).toEqual({ ok: false, error: { code: 'invalidTarget' } })
  }, SLOW)

  it('refuses a banner whose item is pending or of another shop, and accepts an approved one', async () => {
    const start = freshMonth()
    const shop = await data.createShop()
    const other = await data.createShop()
    const pending = await data.createHitItem(shop.id)
    const foreign = await data.createHitItem(other.id, { status: 'approved' })
    const approved = await data.createHitItem(shop.id, { status: 'approved', title: 'Bolo' })
    const banner = (hitItemId: string) => service.create(admin, draft(shop.id, start, addDays(start, 1), { surface: 'hitsBanner', hitItemId }))
    expect(await banner(pending.id)).toEqual({ ok: false, error: { code: 'invalidTarget' } })
    expect(await banner(foreign.id)).toEqual({ ok: false, error: { code: 'invalidTarget' } })
    expect(await banner('0190a000-0000-7000-8000-0000000fffff')).toEqual({ ok: false, error: { code: 'invalidTarget' } })
    expect(await banner(approved.id)).toMatchObject({ ok: true, value: { surface: 'hitsBanner', hitItem: { id: approved.id, title: 'Bolo' } } })
  }, SLOW)

  it('keeps each surface on its own slots', async () => {
    const start = freshMonth()
    await fill(start, 5, FEATURED_PAID_SLOTS_HITS, 'hitsBanner')
    const shop = await data.createShop()
    expect((await service.create(admin, draft(shop.id, start, addDays(start, 5)))).ok).toBe(true)
  }, SLOW)

  it('shows the free slots of each local day', async () => {
    const start = freshMonth()
    await fill(addDays(start, 1), 2, 2)
    const cancelled = await data.createShop()
    const gone = await service.create(admin, draft(cancelled.id, start, addDays(start, 4)))
    if (!gone.ok) throw new Error('placement expected')
    await service.cancel(admin, gone.value.id)
    const availability = await service.availability({ surface: 'discoverCarousel', from: localDateParts(start).isoDate, to: localDateParts(addDays(start, 4)).isoDate })
    expect(availability.days.map((day) => day.freeSlots)).toEqual([
      FEATURED_PAID_SLOTS_DISCOVER,
      FEATURED_PAID_SLOTS_DISCOVER - 2,
      FEATURED_PAID_SLOTS_DISCOVER - 2,
      FEATURED_PAID_SLOTS_DISCOVER,
    ])
  }, SLOW)

  it('lists approved Pro shops only', async () => {
    const pro = await data.createShop()
    const suspendedPro = await data.createShop({ status: 'suspended' })
    const founder = await data.createShop()
    await data.db.update(shops).set({ plan: 'founderPro' }).where(eq(shops.id, pro.id))
    await data.db.update(shops).set({ plan: 'founderPro' }).where(eq(shops.id, suspendedPro.id))
    const start = freshMonth()
    const ids = (await service.list({ surface: 'discoverCarousel', from: localDateParts(start).isoDate, to: localDateParts(addDays(start, 1)).isoDate })).proShops.map((shop) => shop.id)
    expect(ids).toContain(pro.id)
    expect(ids).not.toContain(suspendedPro.id)
    expect(ids).not.toContain(founder.id)
  }, SLOW)

  it('never stores a cancelled row without who cancelled it', async () => {
    const shop = await data.createShop()
    const start = freshMonth()
    const created = await service.create(admin, draft(shop.id, start, addDays(start, 1)))
    if (!created.ok) throw new Error('placement expected')
    await expect(data.db.update(featuredPlacements).set({ cancelledAt: new Date() }).where(eq(featuredPlacements.id, created.value.id))).rejects.toThrow()
  }, SLOW)
})
