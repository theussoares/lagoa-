import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { ShopPhotoSchema, type ShopPhotoUpload } from '#shared/schemas/shop'
import type { ShopPhotoService } from '../ShopPhotoService'

export class HttpShopPhotoService implements ShopPhotoService {
  constructor(private readonly api: ApiClient) {}

  async getPhoto() {
    return allowing('notFound')(await this.api.get('/merchant/shop/photo', ShopPhotoSchema))
  }

  async uploadPhoto(upload: ShopPhotoUpload) {
    return allowing('invalidShopPhoto', 'notFound')(await this.api.post('/merchant/shop/photo', ShopPhotoSchema, { body: upload }))
  }
}
