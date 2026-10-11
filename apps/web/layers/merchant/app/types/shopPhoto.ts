import type { ComputedRef, Ref } from 'vue'
import type { ShopPhotoKind } from '#shared/schemas/shop'
import type { ShopPhotoUploadError } from '../services/ShopPhotoService'

/** Código do último envio que falhou; `unreadable` = o navegador não conseguiu abrir a imagem escolhida. */
export type ShopPhotoErrorCode = ShopPhotoUploadError['code'] | 'unreadable'

export type ShopPhotoSendState = { status: 'idle' } | { status: 'sending' } | { status: 'saved' } | { status: 'error'; code: ShopPhotoErrorCode }

export interface ShopPhotosControl {
  /** URL atual de cada imagem; `null` sem a imagem ou ainda carregando. */
  urls: ComputedRef<Readonly<Record<ShopPhotoKind, string | null>>>
  loading: ComputedRef<boolean>
  send: Ref<Readonly<Record<ShopPhotoKind, ShopPhotoSendState>>>
  choose: (kind: ShopPhotoKind, file: File) => Promise<void>
}
