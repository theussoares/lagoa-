import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { type ShopContact, ShopContactSchema, type ShopContactUpdate } from '#shared/schemas/shop'
import type { Result } from '#shared/types/result'
import type { ShopContactError, ShopContactService } from '../ShopContactService'

export class HttpShopContactService implements ShopContactService {
  constructor(private readonly api: ApiClient) {}

  async getContact(): Promise<Result<ShopContact, ShopContactError>> {
    return allowing('notFound')(await this.api.get('/merchant/shop/contact', ShopContactSchema))
  }

  async saveContact(update: ShopContactUpdate): Promise<Result<ShopContact, ShopContactError>> {
    return allowing('notFound')(await this.api.put('/merchant/shop/contact', ShopContactSchema, { body: update }))
  }
}
