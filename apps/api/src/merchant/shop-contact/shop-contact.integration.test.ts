import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { shops } from '../../database/schema'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleShopContactRepository } from './drizzle-shop-contact.repository'
import { ShopContactService } from './shop-contact.service'

describe.skipIf(!TEST_DATABASE_URL)('shop contact against a real database', () => {
  let data: TestDatabase
  let service: ShopContactService

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new ShopContactService(new DrizzleShopContactRepository(data.db))
  })

  afterAll(async () => data.close())

  it('starts empty, saves and clears the WhatsApp with its button text', async () => {
    const shop = await data.createShop()
    const whatsapp = PhoneNumberSchema.parse('67991234567')
    expect(await service.current(shop.id)).toEqual({ ok: true, value: { whatsapp: null, ctaLabel: null } })
    expect(await service.replace(shop.id, { whatsapp, ctaLabel: 'Comprar agora' })).toEqual({ ok: true, value: { whatsapp, ctaLabel: 'Comprar agora' } })
    expect(await service.current(shop.id)).toEqual({ ok: true, value: { whatsapp, ctaLabel: 'Comprar agora' } })
    expect(await service.replace(shop.id, { whatsapp: null, ctaLabel: 'Comprar agora' })).toEqual({ ok: true, value: { whatsapp: null, ctaLabel: null } })
  }, 30_000)

  it('refuses at the database a button text without WhatsApp and a malformed number', async () => {
    const shop = await data.createShop()
    await expect(data.db.update(shops).set({ ctaLabel: 'Pedir agora' }).where(eq(shops.id, shop.id))).rejects.toThrow()
    await expect(data.db.update(shops).set({ whatsapp: '123' }).where(eq(shops.id, shop.id))).rejects.toThrow()
  }, 30_000)
})
