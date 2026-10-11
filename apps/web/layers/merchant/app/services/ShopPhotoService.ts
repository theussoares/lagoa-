import type { ShopPhotoKind, ShopPhotos, ShopPhotoUpload } from '#shared/schemas/shop'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type ShopPhotoError = ErrorOf<'notFound'> | TransportError
export type ShopPhotoUploadError = ErrorOf<'invalidShopPhoto' | 'notFound'> | TransportError

/** Logo e banner da loja na vitrine do Descobrir. */
export interface ShopPhotoService {
  getPhotos(): Promise<Result<ShopPhotos, ShopPhotoError>>
  uploadPhoto(kind: ShopPhotoKind, upload: ShopPhotoUpload): Promise<Result<ShopPhotos, ShopPhotoUploadError>>
}
