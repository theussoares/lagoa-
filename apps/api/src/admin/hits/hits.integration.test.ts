import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AdminHitItem } from '#shared/schemas/admin'
import { hitItemStatusEvents, hitItems, shops } from '../../database/schema'
import { DrizzleHitsRepository } from '../../merchant/hits/drizzle-hits.repository'
import { HitsService as MerchantHitsService } from '../../merchant/hits/hits.service'
import { ShopPhotoStorage } from '../../merchant/shop-photo/shop-photo.storage'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleAdminHitsRepository } from './drizzle-hits.repository'
import { AdminHitsService } from './hits.service'

const SLOW = 30_000
const SUPABASE_URL = 'https://project.supabase.co'

class NoStorage extends ShopPhotoStorage {
  upload = () => Promise.resolve(true)
  remove = () => Promise.resolve()
}

describe.skipIf(!TEST_DATABASE_URL)('admin hits against a real database', () => {
  let data: TestDatabase
  let service: AdminHitsService
  let merchant: MerchantHitsService
  let admin: { adminId: string }

  beforeAll(async () => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new AdminHitsService(new DrizzleAdminHitsRepository(data.db), { SUPABASE_URL })
    merchant = new MerchantHitsService(new DrizzleHitsRepository(data.db), new NoStorage(), { SUPABASE_URL })
    admin = { adminId: (await data.createAdminUser({ name: 'Ana da Rede' })).id }
  })
  afterAll(async () => data.close())

  /** Todas as páginas da aba, para achar os itens do teste mesmo com outras linhas no banco. */
  const everything = async (status: 'pending' | 'approved'): Promise<AdminHitItem[]> => {
    const all: AdminHitItem[] = []
    let cursor: string | undefined
    do {
      const page = await service.list({ status, ...(cursor !== undefined && { cursor }) })
      all.push(...page.items)
      cursor = page.nextCursor ?? undefined
    } while (cursor !== undefined)
    return all
  }
  const review = async (id: string, action: Parameters<AdminHitsService['review']>[2]) => service.review(admin, id, action)
  const merchantContext = (shopId: string) => ({ shopId, status: 'approved' as const, plan: 'founder' as const, role: 'owner' as const, termsVersion: null })

  it('lists the pending queue oldest first, only with a photo', async () => {
    const shop = await data.createShop()
    const older = await data.createHitItem(shop.id, { createdAt: new Date('2020-01-01T00:00:00Z') })
    const newer = await data.createHitItem(shop.id, { createdAt: new Date('2020-01-02T00:00:00Z') })
    const noPhoto = await data.createHitItem(shop.id, { photoPath: null, createdAt: new Date('2020-01-01T12:00:00Z') })
    const ids = (await everything('pending')).map((item) => item.id)
    expect(ids).toContain(older.id)
    expect(ids).not.toContain(noPhoto.id)
    expect(ids.indexOf(older.id)).toBeLessThan(ids.indexOf(newer.id))
  }, SLOW)

  /** Percorre a aba de uma loja só, com páginas de 2, para forçar a fronteira de página. */
  const pagesOf = async (shopId: string, status: 'pending' | 'approved'): Promise<string[][]> => {
    const small = new AdminHitsService(new DrizzleAdminHitsRepository(data.db), { SUPABASE_URL }, 2)
    const pages: string[][] = []
    let cursor: string | undefined
    do {
      const page = await small.list({ status, ...(cursor !== undefined && { cursor }) }, shopId)
      pages.push(page.items.map((item) => item.id))
      cursor = page.nextCursor ?? undefined
    } while (cursor !== undefined)
    return pages
  }

  it('pages the pending queue without gaps or duplicates, across equal timestamps', async () => {
    const shop = await data.createShop()
    const same = new Date('2019-06-01T00:00:00.123456Z')
    const later = new Date('2019-06-02T00:00:00Z')
    const rows = [
      await data.createHitItem(shop.id, { createdAt: same }),
      await data.createHitItem(shop.id, { createdAt: same }),
      await data.createHitItem(shop.id, { createdAt: same }),
      await data.createHitItem(shop.id, { createdAt: later }),
      await data.createHitItem(shop.id, { createdAt: later }),
    ]
    const pages = await pagesOf(shop.id, 'pending')
    expect(pages.map((page) => page.length)).toEqual([2, 2, 1])
    const flat = pages.flat()
    expect(new Set(flat).size).toBe(5)
    expect([...flat].sort()).toEqual(rows.map((row) => row.id).sort())
    expect(flat.slice(0, 3).sort()).toEqual(rows.slice(0, 3).map((row) => row.id).sort())
  }, SLOW)

  it('pages the approved tab without gaps or duplicates, including null approved_at at the tail', async () => {
    const shop = await data.createShop()
    const same = new Date('2019-06-01T00:00:00.123456Z')
    const newest = new Date('2019-06-03T00:00:00Z')
    const approved = { status: 'approved' as const }
    const rows = [
      await data.createHitItem(shop.id, { ...approved, approvedAt: newest }),
      await data.createHitItem(shop.id, { ...approved, approvedAt: same }),
      await data.createHitItem(shop.id, { ...approved, approvedAt: same }),
      await data.createHitItem(shop.id, { ...approved, approvedAt: same }),
      await data.createHitItem(shop.id, { ...approved, approvedAt: null }),
      await data.createHitItem(shop.id, { ...approved, approvedAt: null }),
      await data.createHitItem(shop.id, { ...approved, approvedAt: null }),
    ]
    const pages = await pagesOf(shop.id, 'approved')
    expect(pages.map((page) => page.length)).toEqual([2, 2, 2, 1])
    const flat = pages.flat()
    expect(new Set(flat).size).toBe(7)
    expect([...flat].sort()).toEqual(rows.map((row) => row.id).sort())
    expect(flat[0]).toBe(rows[0]?.id)
    expect(flat.slice(1, 4).sort()).toEqual(rows.slice(1, 4).map((row) => row.id).sort())
    expect(flat.slice(4).sort()).toEqual(rows.slice(4).map((row) => row.id).sort())
  }, SLOW)

  it('shows the item button, else the shop button, with where it came from', async () => {
    const shop = await data.createShop()
    await data.db.update(shops).set({ ctaKind: 'url', ctaUrl: 'https://loja.example/oferta', ctaLabel: 'Ver loja' }).where(eq(shops.id, shop.id))
    const inherits = await data.createHitItem(shop.id)
    const own = await data.createHitItem(shop.id, { ctaKind: 'whatsapp', whatsapp: '67991230374', whatsappMessage: 'Oi', ctaLabel: 'Pedir' })
    const none = await data.createHitItem((await data.createShop()).id)
    const byId = new Map((await everything('pending')).map((item) => [item.id, item]))
    expect(byId.get(inherits.id)).toMatchObject({ contactSource: 'shop', contact: { kind: 'url', url: 'https://loja.example/oferta' } })
    expect(byId.get(own.id)).toMatchObject({ contactSource: 'item', contact: { kind: 'whatsapp', whatsapp: '67991230374' } })
    expect(byId.get(none.id)).toMatchObject({ contactSource: 'shop', contact: null })
    expect(byId.get(own.id)?.shop).toMatchObject({ id: shop.id, status: 'approved' })
    expect(byId.get(own.id)?.photoUrl).toMatch(/^https:\/\/project\.supabase\.co\/storage\/v1\/object\/public\/shop-assets\/hits\//)
  }, SLOW)

  it('approves, stamps approved_at, clears the reason and records the admin', async () => {
    const shop = await data.createShop()
    const item = await data.createHitItem(shop.id)
    const result = await review(item.id, { action: 'approve', expectedVersion: 1 })
    expect(result).toMatchObject({ ok: true, value: { id: item.id, status: 'approved', rejectionReason: null } })
    const [row] = await data.db.select().from(hitItems).where(eq(hitItems.id, item.id))
    expect(row?.approvedAt).toBeInstanceOf(Date)
    const events = await data.db.select().from(hitItemStatusEvents).where(eq(hitItemStatusEvents.hitItemId, item.id))
    expect(events).toMatchObject([{ fromStatus: 'pending', toStatus: 'approved', actorAdminId: admin.adminId, reason: null }])
    expect((await everything('approved')).map((entry) => entry.id)).toContain(item.id)
    expect((await everything('pending')).map((entry) => entry.id)).not.toContain(item.id)
  }, SLOW)

  it('refuses a stale approval after the merchant edits (version 1 -> 2) and keeps the item pending', async () => {
    const shop = await data.createShop()
    const item = await data.createHitItem(shop.id)
    const edited = await merchant.update(merchantContext(shop.id), item.id, { title: 'Editado', description: null, priceCents: 500, contact: null, endsAt: null })
    expect(edited.ok).toBe(true)
    expect(await review(item.id, { action: 'approve', expectedVersion: 1 })).toEqual({ ok: false, error: { code: 'conflict' } })
    const [row] = await data.db.select().from(hitItems).where(eq(hitItems.id, item.id))
    expect(row).toMatchObject({ status: 'pending', version: 2, approvedAt: null })
    expect(await review(item.id, { action: 'approve', expectedVersion: 2 })).toMatchObject({ ok: true, value: { status: 'approved' } })
  }, SLOW)

  it('rejects with a reason and refuses approving a rejected item', async () => {
    const shop = await data.createShop()
    const item = await data.createHitItem(shop.id)
    expect(await review(item.id, { action: 'reject', expectedVersion: 1, reason: 'Foto escura' })).toMatchObject({ ok: true, value: { status: 'rejected', rejectionReason: 'Foto escura' } })
    expect(await review(item.id, { action: 'approve', expectedVersion: 1 })).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await review(item.id, { action: 'takeDown', reason: 'x' })).toEqual({ ok: false, error: { code: 'invalidTransition' } })
  }, SLOW)

  it('takes down an approved item and the merchant sees the reason', async () => {
    const shop = await data.createShop()
    const item = await data.createHitItem(shop.id)
    await review(item.id, { action: 'approve', expectedVersion: 1 })
    expect(await review(item.id, { action: 'takeDown', reason: 'Produto proibido' })).toMatchObject({ ok: true, value: { status: 'rejected', rejectionReason: 'Produto proibido' } })
    const list = await merchant.list(merchantContext(shop.id))
    expect(list.items).toMatchObject([{ id: item.id, status: 'rejected', rejectionReason: 'Produto proibido' }])
    const events = await data.db.select().from(hitItemStatusEvents).where(eq(hitItemStatusEvents.hitItemId, item.id))
    expect(events.map((event) => [event.fromStatus, event.toStatus, event.reason])).toEqual(
      expect.arrayContaining([['approved', 'rejected', 'Produto proibido']]),
    )
  }, SLOW)

  it('refuses to approve an item without photo, and answers notFound for an unknown id', async () => {
    const shop = await data.createShop()
    const item = await data.createHitItem(shop.id, { photoPath: null })
    expect(await review(item.id, { action: 'approve', expectedVersion: 1 })).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(await review(randomUUID(), { action: 'reject', expectedVersion: 1, reason: 'x' })).toEqual({ ok: false, error: { code: 'notFound', entity: 'hitItem' } })
  }, SLOW)

  it('lets two concurrent decisions through only once', async () => {
    const shop = await data.createShop()
    const item = await data.createHitItem(shop.id)
    const results = await Promise.all([review(item.id, { action: 'approve', expectedVersion: 1 }), review(item.id, { action: 'reject', expectedVersion: 1, reason: 'tarde' })])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    const events = await data.db.select().from(hitItemStatusEvents).where(eq(hitItemStatusEvents.hitItemId, item.id))
    expect(events).toHaveLength(1)
  }, SLOW)
})
