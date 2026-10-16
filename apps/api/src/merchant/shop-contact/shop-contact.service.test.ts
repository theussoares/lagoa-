import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { ShopContact } from '#shared/schemas/shop'
import { ShopContactRepository } from './shop-contact.repository'
import { ShopContactService } from './shop-contact.service'

class FakeShopContactRepository extends ShopContactRepository {
  stored: ShopContact | null = { contact: null }
  find = () => Promise.resolve(this.stored)
  replace = (_shopId: string, contact: ShopContact) => {
    if (this.stored !== null) this.stored = contact
    return Promise.resolve(this.stored)
  }
}

const whatsapp = PhoneNumberSchema.parse('67991234567')

describe('ShopContactService', () => {
  it('saves the WhatsApp button with its ready message', async () => {
    const service = new ShopContactService(new FakeShopContactRepository())
    const contact = { kind: 'whatsapp', whatsapp, message: 'Oi, quero agendar', ctaLabel: 'Agendar agora' } as const
    expect(await service.replace('shop-1', { contact })).toEqual({ ok: true, value: { contact } })
  })

  it('saves the link button with its label', async () => {
    const service = new ShopContactService(new FakeShopContactRepository())
    const contact = { kind: 'url', url: 'https://loja.com/x', ctaLabel: 'Comprar agora' } as const
    expect(await service.replace('shop-1', { contact })).toEqual({ ok: true, value: { contact } })
  })

  it('removes the button with a null contact', async () => {
    const repository = new FakeShopContactRepository()
    const service = new ShopContactService(repository)
    await service.replace('shop-1', { contact: { kind: 'whatsapp', whatsapp, message: null, ctaLabel: null } })
    expect(await service.replace('shop-1', { contact: null })).toEqual({ ok: true, value: { contact: null } })
  })

  it('answers notFound for a shop that does not exist', async () => {
    const repository = new FakeShopContactRepository()
    repository.stored = null
    const service = new ShopContactService(repository)
    expect(await service.current('shop-1')).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
    expect(await service.replace('shop-1', { contact: null })).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
  })
})
