import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import {
  type HitItemDraft,
  type MerchantHitItem,
  MerchantHitItemListSchema,
  type MerchantHitItemList,
  MerchantHitItemSchema,
} from '#shared/schemas/hitItem'
import type { ShopPhotoUpload } from '#shared/schemas/shop'
import type { Result } from '#shared/types/result'
import type { HitItemError, HitItemService } from '../HitItemService'

const allowed = allowing('notFound', 'limitReached', 'invalidTransition', 'invalidShopPhoto')
const BASE = '/merchant/hits'

export class HttpHitItemService implements HitItemService {
  constructor(private readonly api: ApiClient) {}

  async list(): Promise<Result<MerchantHitItemList, HitItemError>> {
    return allowed(await this.api.get(BASE, MerchantHitItemListSchema))
  }

  async create(draft: HitItemDraft): Promise<Result<MerchantHitItem, HitItemError>> {
    return allowed(await this.api.post(BASE, MerchantHitItemSchema, { body: draft }))
  }

  async update(id: string, draft: HitItemDraft): Promise<Result<MerchantHitItem, HitItemError>> {
    return allowed(await this.api.patch(`${BASE}/${id}`, MerchantHitItemSchema, { body: draft }))
  }

  async uploadPhoto(id: string, upload: ShopPhotoUpload): Promise<Result<MerchantHitItem, HitItemError>> {
    return allowed(await this.api.put(`${BASE}/${id}/photo`, MerchantHitItemSchema, { body: upload }))
  }

  async archive(id: string): Promise<Result<MerchantHitItem, HitItemError>> {
    return allowed(await this.api.post(`${BASE}/${id}/archive`, MerchantHitItemSchema))
  }

  async unarchive(id: string): Promise<Result<MerchantHitItem, HitItemError>> {
    return allowed(await this.api.post(`${BASE}/${id}/unarchive`, MerchantHitItemSchema))
  }
}
