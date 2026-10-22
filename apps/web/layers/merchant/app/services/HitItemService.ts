import type { HitItemDraft, MerchantHitItem, MerchantHitItemList } from '#shared/schemas/hitItem'
import type { ShopPhotoUpload } from '#shared/schemas/shop'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type HitItemError = ErrorOf<'notFound' | 'limitReached' | 'invalidTransition' | 'invalidShopPhoto'> | TransportError

/** Produtos do Hits da loja. Toda edição, foto nova ou desarquivar volta o item para a análise da rede. */
export interface HitItemService {
  list(): Promise<Result<MerchantHitItemList, HitItemError>>
  create(draft: HitItemDraft): Promise<Result<MerchantHitItem, HitItemError>>
  update(id: string, draft: HitItemDraft): Promise<Result<MerchantHitItem, HitItemError>>
  uploadPhoto(id: string, upload: ShopPhotoUpload): Promise<Result<MerchantHitItem, HitItemError>>
  archive(id: string): Promise<Result<MerchantHitItem, HitItemError>>
  unarchive(id: string): Promise<Result<MerchantHitItem, HitItemError>>
}
