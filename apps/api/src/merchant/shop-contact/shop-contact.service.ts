import { Injectable } from '@nestjs/common'
import type { ShopContact, ShopContactUpdate } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { planShopContact } from './shop-contact.rules'
import { ShopContactRepository } from './shop-contact.repository'

type NotFound = ErrorOf<'notFound'>

/** WhatsApp e texto do botão dos cards da loja. Vale também aguardando aprovação, como as fotos. */
@Injectable()
export class ShopContactService {
  constructor(private readonly contacts: ShopContactRepository) {}

  async current(shopId: string): Promise<Result<ShopContact, NotFound>> {
    const contact = await this.contacts.find(shopId)
    return contact === null ? err({ code: 'notFound', entity: 'shop' }) : ok(contact)
  }

  async replace(shopId: string, update: ShopContactUpdate): Promise<Result<ShopContact, NotFound>> {
    const saved = await this.contacts.replace(shopId, planShopContact(update))
    return saved === null ? err({ code: 'notFound', entity: 'shop' }) : ok(saved)
  }
}
