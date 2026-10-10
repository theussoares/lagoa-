import type { ComputedRef, Ref } from 'vue'
import type { ShopPhotoUploadError } from '../services/ShopPhotoService'

/** Código do último envio que falhou; `unreadable` = o navegador não conseguiu abrir a imagem escolhida. */
export type ShopPhotoErrorCode = ShopPhotoUploadError['code'] | 'unreadable'

export type ShopPhotoSendState = { status: 'idle' } | { status: 'sending' } | { status: 'saved' } | { status: 'error'; code: ShopPhotoErrorCode }

export interface ShopPhotoControl {
  /** Foto atual; `null` sem foto ou ainda carregando. */
  imageUrl: ComputedRef<string | null>
  loading: ComputedRef<boolean>
  send: Ref<ShopPhotoSendState>
  choose: (file: File) => Promise<void>
}
