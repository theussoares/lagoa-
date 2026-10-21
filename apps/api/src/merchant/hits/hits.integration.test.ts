import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { HitItemDraft } from '#shared/schemas/hitItem'
import { hitItemStatusEvents, hitItems } from '../../database/schema'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import type { MerchantShopContext } from '../access/merchant-shop.context'
import { pngHeader } from '../shop-photo/image-fixtures'
import { ShopPhotoStorage } from '../shop-photo/shop-photo.storage'
import { DrizzleHitsRepository } from './drizzle-hits.repository'
import { HitsService } from './hits.service'

const draft = (title: string, extra: Partial<HitItemDraft> = {}): HitItemDraft => ({ title, description: null, priceCents: 1990, contact: null, endsAt: null, ...extra })
const PNG = { contentType: 'image/png', dataBase64: pngHeader(800, 600).toString('base64') } as const

class FakeStorage extends ShopPhotoStorage {
  uploaded: string[] = []
  removed: string[] = []
  upload = (path: string) => {
    this.uploaded.push(path)
    return Promise.resolve(true)
  }
  remove = (path: string) => {
    this.removed.push(path)
    return Promise.resolve()
  }
}

describe.skipIf(!TEST_DATABASE_URL)('merchant hits against a real database', () => {
  let data: TestDatabase
  let service: HitsService
  let storage: FakeStorage
  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    storage = new FakeStorage()
    service = new HitsService(new DrizzleHitsRepository(data.db), storage, { SUPABASE_URL: 'https://project.supabase.co' })
  })
  afterAll(async () => data.close())

  const context = async (plan: MerchantShopContext['plan'] = 'founder'): Promise<MerchantShopContext> => {
    const shop = await data.createShop()
    return { shopId: shop.id, status: 'approved', plan, role: 'owner', termsVersion: null }
  }
  const created = async (shop: MerchantShopContext, title: string) => {
    const result = await service.create(shop, draft(title))
    if (!result.ok) throw new Error('create expected')
    return result.value
  }

  it('creates pending without photo and lists newest first with the cap', async () => {
    const shop = await context()
    const first = await created(shop, 'Primeiro')
    const second = await created(shop, 'Segundo')
    expect(first).toMatchObject({ status: 'pending', photoUrl: null, contact: null, rejectionReason: null })
    const list = await service.list(shop)
    expect(list.cap).toBe(5)
    expect(list.items.map((item) => item.title)).toEqual(['Segundo', 'Primeiro'])
    expect(list.items[0]?.id).toBe(second.id)
  }, 30_000)

  it('stores the own button and the end date', async () => {
    const shop = await context()
    const contact = { kind: 'url', url: 'https://loja.com/p', ctaLabel: 'Comprar' } as const
    const endsAt = '2030-01-01T12:00:00.000Z'
    const result = await service.create(shop, draft('Com botão', { contact, endsAt }))
    expect(result).toMatchObject({ ok: true, value: { contact, endsAt } })
  }, 30_000)

  it('sends an approved item back to pending on edit, raising the version and writing the event', async () => {
    const shop = await context()
    const item = await data.createHitItem(shop.shopId, { status: 'approved', approvedAt: new Date(), version: 3 })
    const result = await service.update(shop, item.id, draft('Novo nome'))
    expect(result).toMatchObject({ ok: true, value: { status: 'pending', title: 'Novo nome' } })
    const [row] = await data.db.select().from(hitItems).where(eq(hitItems.id, item.id))
    expect(row?.version).toBe(4)
    const events = await data.db.select().from(hitItemStatusEvents).where(eq(hitItemStatusEvents.hitItemId, item.id))
    expect(events).toMatchObject([{ fromStatus: 'approved', toStatus: 'pending', actorAdminId: null }])
  }, 30_000)

  it('clears the rejection reason when a rejected item is edited', async () => {
    const shop = await context()
    const item = await data.createHitItem(shop.shopId, { status: 'rejected', rejectionReason: 'Foto escura' })
    expect(await service.update(shop, item.id, draft('Corrigido'))).toMatchObject({ ok: true, value: { status: 'pending', rejectionReason: null } })
  }, 30_000)

  it('refuses the 6th active item of a Fundador but lets Fundador Pro go on', async () => {
    const shop = await context()
    for (let n = 1; n <= 5; n++) await created(shop, `Item ${n}`)
    expect(await service.create(shop, draft('Sexto'))).toEqual({ ok: false, error: { code: 'limitReached' } })
    const pro = await context('founderPro')
    for (let n = 1; n <= 6; n++) await created(pro, `Item ${n}`)
  }, 60_000)

  it('does not let two creations at once pass the cap', async () => {
    const shop = await context()
    for (let n = 1; n <= 4; n++) await created(shop, `Item ${n}`)
    const results = await Promise.all([service.create(shop, draft('A')), service.create(shop, draft('B')), service.create(shop, draft('C'))])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
  }, 60_000)

  it('answers notFound for an item of another shop on edit, photo, archive and unarchive', async () => {
    const mine = await context()
    const other = await context()
    const theirs = await data.createHitItem(other.shopId, { status: 'approved' })
    const notFound = { ok: false, error: { code: 'notFound', entity: 'hitItem' } }
    expect(await service.update(mine, theirs.id, draft('Invasão'))).toEqual(notFound)
    expect(await service.replacePhoto(mine, theirs.id, PNG)).toEqual(notFound)
    expect(await service.archive(mine, theirs.id)).toEqual(notFound)
    expect(await service.unarchive(mine, theirs.id)).toEqual(notFound)
    const [row] = await data.db.select().from(hitItems).where(eq(hitItems.id, theirs.id))
    expect(row).toMatchObject({ title: 'Produto de teste', status: 'approved', version: 1 })
    expect(storage.uploaded.filter((path) => path.includes(theirs.id))).toEqual([])
  }, 30_000)

  it('replaces the photo as an edit, under hits/<shop>/, and removes the old file', async () => {
    const shop = await context()
    const item = await data.createHitItem(shop.shopId, { status: 'approved', photoPath: 'hits/old.jpg' })
    const result = await service.replacePhoto(shop, item.id, PNG)
    expect(result).toMatchObject({ ok: true, value: { status: 'pending' } })
    if (!result.ok) return
    expect(result.value.photoUrl).toMatch(new RegExp(`/shop-assets/hits/${shop.shopId}/${item.id}-.+\\.png$`))
    expect(storage.removed).toContain('hits/old.jpg')
    const [row] = await data.db.select().from(hitItems).where(eq(hitItems.id, item.id))
    expect(row?.version).toBe(2)
  }, 30_000)

  it('gives the first photo to an item created without one', async () => {
    const shop = await context()
    const item = await created(shop, 'Sem foto')
    expect(await service.replacePhoto(shop, item.id, PNG)).toMatchObject({ ok: true, value: { status: 'pending' } })
  }, 30_000)

  it('archives, frees the slot, and unarchives back to pending while there is room', async () => {
    const shop = await context()
    const items = []
    for (let n = 1; n <= 5; n++) items.push(await created(shop, `Item ${n}`))
    const first = items[0]
    if (!first) throw new Error('item expected')
    expect(await service.archive(shop, first.id)).toMatchObject({ ok: true, value: { status: 'archived' } })
    expect(await service.archive(shop, first.id)).toMatchObject({ ok: true, value: { status: 'archived' } })
    await created(shop, 'Entrou no lugar')
    expect(await service.unarchive(shop, first.id)).toEqual({ ok: false, error: { code: 'limitReached' } })
    const second = items[1]
    if (!second) throw new Error('item expected')
    await service.archive(shop, second.id)
    expect(await service.unarchive(shop, first.id)).toMatchObject({ ok: true, value: { status: 'pending' } })
    const events = await data.db.select().from(hitItemStatusEvents).where(eq(hitItemStatusEvents.hitItemId, first.id))
    expect(events.map((event) => `${event.fromStatus}>${event.toStatus}`).sort()).toEqual(['archived>pending', 'pending>archived'])
  }, 60_000)

  it('refuses to edit or unarchive what is in the wrong state', async () => {
    const shop = await context()
    const archived = await data.createHitItem(shop.shopId, { status: 'archived' })
    const live = await data.createHitItem(shop.shopId, { status: 'approved' })
    expect(await service.update(shop, archived.id, draft('X'))).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await service.replacePhoto(shop, archived.id, PNG)).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await service.unarchive(shop, live.id)).toEqual({ ok: false, error: { code: 'invalidTransition' } })
  }, 30_000)

  it('keeps only the newest archived items in the list but all the active ones', async () => {
    const shop = await context()
    await data.createHitItem(shop.shopId, { status: 'approved', createdAt: new Date('2020-01-01') })
    for (let n = 0; n < 52; n++) await data.createHitItem(shop.shopId, { status: 'archived', createdAt: new Date(Date.UTC(2024, 0, 1, 0, n)) })
    const list = await service.list(shop)
    expect(list.items).toHaveLength(51)
    expect(list.items.filter((item) => item.status === 'approved')).toHaveLength(1)
  }, 60_000)
})
