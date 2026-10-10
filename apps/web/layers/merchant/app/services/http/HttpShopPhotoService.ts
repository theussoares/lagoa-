import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { type ShopPhoto, ShopPhotoSchema, type ShopPhotoUpload } from '#shared/schemas/shop'
import type { Result } from '#shared/types/result'
import type { ShopPhotoError, ShopPhotoService, ShopPhotoUploadError } from '../ShopPhotoService'

export class HttpShopPhotoService implements ShopPhotoService {
  constructor(private readonly api: ApiClient) {}

  async getPhoto(): Promise<Result<ShopPhoto, ShopPhotoError>> {
    return allowing('notFound')(await this.api.get('/merchant/shop/photo', ShopPhotoSchema))
  }

  async uploadPhoto(upload: ShopPhotoUpload): Promise<Result<ShopPhoto, ShopPhotoUploadError>> {
    return allowing('invalidShopPhoto', 'notFound')(await this.api.post('/merchant/shop/photo', ShopPhotoSchema, { body: upload }))
  }
}
