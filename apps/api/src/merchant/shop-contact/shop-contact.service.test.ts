import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import type { ShopContact } from '#shared/schemas/shop'
import { ShopContactRepository } from './shop-contact.repository'
import { ShopContactService } from './shop-contact.service'

class FakeShopContactRepository extends ShopContactRepository {
  stored: ShopContact | null = { whatsapp: null, ctaLabel: null }
  find = () => Promise.resolve(this.stored)
  replace = (_shopId: string, contact: ShopContact) => {
    if (this.stored !== null) this.stored = contact
    return Promise.resolve(this.stored)
  }
}

const whatsapp = PhoneNumberSchema.parse('67991234567')

describe('ShopContactService', () => {
  it('saves the WhatsApp with the button text', async () => {
    const service = new ShopContactService(new FakeShopContactRepository())
    expect(await service.replace('shop-1', { whatsapp, ctaLabel: 'Agendar agora' })).toEqual({ ok: true, value: { whatsapp, ctaLabel: 'Agendar agora' } })
  })

  it('keeps no button text without a WhatsApp', async () => {
    const service = new ShopContactService(new FakeShopContactRepository())
    expect(await service.replace('shop-1', { whatsapp: null, ctaLabel: 'Pedir agora' })).toEqual({ ok: true, value: { whatsapp: null, ctaLabel: null } })
  })

  it('answers notFound for a shop that does not exist', async () => {
    const repository = new FakeShopContactRepository()
    repository.stored = null
    const service = new ShopContactService(repository)
    expect(await service.current('shop-1')).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
    expect(await service.replace('shop-1', { whatsapp, ctaLabel: null })).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
  })
})
