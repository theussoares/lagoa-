import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { ShopContactUpdateSchema } from '#shared/schemas/shop'
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

  it('starts empty, saves each kind, switches between them and clears', async () => {
    const shop = await data.createShop()
    const whatsapp = PhoneNumberSchema.parse('67991234567')
    const chat = { kind: 'whatsapp', whatsapp, message: 'Oi!\nQuero agendar', ctaLabel: 'Agendar agora' } as const
    const link = { kind: 'url', url: 'https://loja.com/cardapio', ctaLabel: 'Ver cardápio' } as const
    expect(await service.current(shop.id)).toEqual({ ok: true, value: { contact: null } })
    expect(await service.replace(shop.id, { contact: chat })).toEqual({ ok: true, value: { contact: chat } })
    expect(await service.replace(shop.id, { contact: link })).toEqual({ ok: true, value: { contact: link } })
    expect(await service.current(shop.id)).toEqual({ ok: true, value: { contact: link } })
    const [row] = await data.db.select({ whatsapp: shops.whatsapp, message: shops.whatsappMessage }).from(shops).where(eq(shops.id, shop.id))
    expect(row).toEqual({ whatsapp: null, message: null })
    expect(await service.replace(shop.id, { contact: null })).toEqual({ ok: true, value: { contact: null } })
  }, 30_000)

  it('stores a link typed with upper case in the canonical form the database check accepts', async () => {
    const shop = await data.createShop()
    const update = ShopContactUpdateSchema.parse({ contact: { kind: 'url', url: 'HTTPS://Loja.com/Cardapio', ctaLabel: 'Ver cardápio' } })
    expect(await service.replace(shop.id, update)).toEqual({
      ok: true,
      value: { contact: { kind: 'url', url: 'https://loja.com/Cardapio', ctaLabel: 'Ver cardápio' } },
    })
  }, 30_000)

  it('refuses at the database every combination the modes do not allow', async () => {
    const shop = await data.createShop()
    const update = async (values: Partial<typeof shops.$inferInsert>) =>
      data.db.update(shops).set(values).where(eq(shops.id, shop.id))
    const url = { ctaKind: 'url', ctaUrl: 'https://loja.com', ctaLabel: 'Comprar' }
    await expect(update({ ctaLabel: 'Pedir agora' })).rejects.toThrow()
    await expect(update({ whatsapp: '123' })).rejects.toThrow()
    await expect(update({ ctaKind: 'whatsapp' })).rejects.toThrow()
    await expect(update({ ctaKind: 'other', whatsapp: '67991234567' })).rejects.toThrow()
    await expect(update({ whatsapp: '67991234567' })).rejects.toThrow()
    await expect(update({ ...url, ctaUrl: 'http://loja.com' })).rejects.toThrow()
    await expect(update({ ...url, ctaUrl: 'javascript:alert(1)' })).rejects.toThrow()
    await expect(update({ ...url, ctaLabel: null })).rejects.toThrow()
    await expect(update({ ...url, ctaUrl: `https://loja.com/${'a'.repeat(500)}` })).rejects.toThrow()
    await expect(update({ ...url, whatsapp: '67991234567' })).rejects.toThrow()
    await expect(update({ ctaKind: 'whatsapp', whatsapp: '67991234567', ctaUrl: 'https://loja.com' })).rejects.toThrow()
    await expect(update({ ctaKind: 'whatsapp', whatsapp: '67991234567', whatsappMessage: 'a'.repeat(301) })).rejects.toThrow()
    await expect(update({ ctaKind: 'whatsapp', whatsapp: '67991234567', whatsappMessage: '' })).rejects.toThrow()
    await expect(update({ ...url })).resolves.toBeDefined()
  }, 30_000)
})
