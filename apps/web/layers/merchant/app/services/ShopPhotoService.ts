import type { ShopPhoto, ShopPhotoUpload } from '#shared/schemas/shop'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type ShopPhotoError = ErrorOf<'notFound'> | TransportError
export type ShopPhotoUploadError = ErrorOf<'invalidShopPhoto' | 'notFound'> | TransportError

/** Foto da loja na vitrine do Descobrir. */
export interface ShopPhotoService {
  getPhoto(): Promise<Result<ShopPhoto, ShopPhotoError>>
  uploadPhoto(upload: ShopPhotoUpload): Promise<Result<ShopPhoto, ShopPhotoUploadError>>
}
