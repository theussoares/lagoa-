import { describe, expect, it } from 'vitest'
import { err, ok } from '#shared/types/result'
import type { MerchantShopContext } from '../access/merchant-shop.context'
import { pngHeader } from '../shop-photo/image-fixtures'
import { ShopPhotoStorage } from '../shop-photo/shop-photo.storage'
import { type HitItemRow, HitsRepository } from './hits.repository'
import { HitsService } from './hits.service'

const SHOP: MerchantShopContext = { shopId: 'shop-1', status: 'approved', plan: 'founder', role: 'owner', termsVersion: null }
const NOW = new Date('2026-01-01T00:00:00Z')
const PNG = { contentType: 'image/png', dataBase64: pngHeader(800, 600).toString('base64') } as const

const row = (overrides: Partial<HitItemRow> = {}): HitItemRow => ({
  id: 'item-1', shopId: 'shop-1', title: 'Bolo', description: null, priceCents: null, photoPath: 'hits/shop-1/old.png',
  ctaKind: null, whatsapp: null, whatsappMessage: null, ctaUrl: null, ctaLabel: null,
  status: 'approved', rejectionReason: null, endsAt: null, version: 1, createdAt: NOW, updatedAt: NOW, ...overrides,
})

class FakeRepository extends HitsRepository {
  constructor(private stored: HitItemRow | null, private readonly lockedFailure: 'invalidTransition' | null = null) {
    super()
  }
  findForShop = () => Promise.resolve(this.stored)
  listForShop = () => Promise.resolve([])
  insert = () => Promise.reject(new Error('not used'))
  updateLocked: HitsRepository['updateLocked'] = (_shopId, _id, mutate) => {
    if (this.stored === null) return Promise.resolve(err({ code: 'notFound', entity: 'hitItem' }))
    if (this.lockedFailure !== null) return Promise.resolve(err({ code: this.lockedFailure }))
    const decision = mutate(this.stored, 0)
    if (!decision.ok) return Promise.resolve(decision)
    this.stored = { ...this.stored, ...decision.value }
    return Promise.resolve(ok(this.stored))
  }
}

class FakeStorage extends ShopPhotoStorage {
  removed: string[] = []
  upload = () => Promise.resolve(true)
  remove = (path: string) => {
    this.removed.push(path)
    return Promise.resolve()
  }
}

const serviceFor = (repository: HitsRepository, storage = new FakeStorage()) =>
  new HitsService(repository, storage, { SUPABASE_URL: 'https://project.supabase.co' })

describe('HitsService photo', () => {
  it('removes the old file after the swap', async () => {
    const storage = new FakeStorage()
    const result = await serviceFor(new FakeRepository(row()), storage).replacePhoto(SHOP, 'item-1', PNG)
    expect(result).toMatchObject({ ok: true, value: { status: 'pending' } })
    expect(storage.removed).toEqual(['hits/shop-1/old.png'])
  })

  it('removes the new file when the locked update refuses', async () => {
    const storage = new FakeStorage()
    const result = await serviceFor(new FakeRepository(row(), 'invalidTransition'), storage).replacePhoto(SHOP, 'item-1', PNG)
    expect(result).toEqual({ ok: false, error: { code: 'invalidTransition' } })
    expect(storage.removed).toHaveLength(1)
    expect(storage.removed[0]).toMatch(/^hits\/shop-1\/item-1-.+\.png$/)
  })

  it('refuses bytes that are not the declared image before touching storage', async () => {
    const storage = new FakeStorage()
    const svg = { contentType: 'image/png', dataBase64: Buffer.from('<svg/>').toString('base64') } as const
    expect(await serviceFor(new FakeRepository(row()), storage).replacePhoto(SHOP, 'item-1', svg)).toEqual({ ok: false, error: { code: 'invalidShopPhoto' } })
  })
})

describe('HitsService archive', () => {
  it('archiving an archived item changes nothing', async () => {
    const result = await serviceFor(new FakeRepository(row({ status: 'archived' }))).archive(SHOP, 'item-1')
    expect(result).toMatchObject({ ok: true, value: { status: 'archived' } })
  })
})
