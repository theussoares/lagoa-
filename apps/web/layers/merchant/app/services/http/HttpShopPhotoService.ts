import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { type ShopPhotoKind, type ShopPhotos, ShopPhotosSchema, type ShopPhotoUpload } from '#shared/schemas/shop'
import type { Result } from '#shared/types/result'
import type { ShopPhotoError, ShopPhotoService, ShopPhotoUploadError } from '../ShopPhotoService'

export class HttpShopPhotoService implements ShopPhotoService {
  constructor(private readonly api: ApiClient) {}

  async getPhotos(): Promise<Result<ShopPhotos, ShopPhotoError>> {
    return allowing('notFound')(await this.api.get('/merchant/shop/photo', ShopPhotosSchema))
  }

  async uploadPhoto(kind: ShopPhotoKind, upload: ShopPhotoUpload): Promise<Result<ShopPhotos, ShopPhotoUploadError>> {
    return allowing('invalidShopPhoto', 'notFound')(await this.api.post(`/merchant/shop/photo/${kind}`, ShopPhotosSchema, { body: upload }))
  }
}
