import type { ComputedRef, Ref } from 'vue'
import type { ShopPhotoUpload } from '#shared/schemas/shop'
import type { HitItemDraft, HitItemStatus, MerchantHitItem } from '#shared/schemas/hitItem'
import type { HitItemError } from '../services/HitItemService'
import type { HIT_ITEM_FORM_ERROR_CODES } from '../utils/hitItemForm'
import type { ShopContactForm, ShopContactFormErrorCode, ShopContactMessage, ShopContactPreview } from './shopContact'

export type HitItemFormErrorCode = (typeof HIT_ITEM_FORM_ERROR_CODES)[number]

/** O que a pessoa digitou em "Hits": campos em texto, como nos inputs. `endsAt` é um dia (AAAA-MM-DD) ou vazio. */
export interface HitItemForm {
  readonly title: string
  readonly description: string
  /** "12,50"; vazio = sob consulta. */
  readonly price: string
  readonly endsAt: string
  /** `true` = o produto usa o botão da loja (`contact: null`). */
  readonly useShopButton: boolean
  readonly contact: ShopContactForm
}

export type HitItemDraftResult =
  | { readonly ok: true; readonly draft: HitItemDraft }
  | { readonly ok: false; readonly code: HitItemFormErrorCode | ShopContactFormErrorCode }

/** Uma linha da lista: o produto mais o que a tela precisa dele já decidido. */
export interface HitItemRow {
  readonly item: MerchantHitItem
  readonly status: HitItemStatus
  readonly priceLabel: string | null
  /** Sem foto o item não entra na análise da rede. */
  readonly missingPhoto: boolean
  readonly rejectionReason: string | null
  readonly canEdit: boolean
}

export type HitItemSaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'error'; readonly code: HitItemError['code'] | HitItemFormErrorCode | ShopContactFormErrorCode | 'unreadable' }

export interface HitItemSaveError {
  readonly field: HitItemFormErrorCode | ShopContactFormErrorCode | null
  /** Chave i18n completa. */
  readonly key: string | null
}

/** O produto como vai aparecer no card (sem os campos que ainda não dão para mostrar). */
export interface HitItemPreview {
  readonly title: string
  readonly description: string | null
  readonly priceLabel: string | null
  readonly photoUrl: string | null
  readonly button: ShopContactPreview | null
}

/** Retorno de `useHitsScreen`: um `reactive`, então a página lê direto, sem `.value`. */
export interface HitsScreen {
  readonly loading: boolean
  readonly loadError: HitItemError['code'] | null
  readonly rows: readonly HitItemRow[]
  readonly cap: number
  readonly activeCount: number
  readonly canCreate: boolean
  /** O formulário está aberto (novo produto ou edição). */
  readonly formOpen: boolean
  readonly editingId: string | null
  readonly form: HitItemForm
  readonly photoUrl: string | null
  readonly preview: HitItemPreview
  readonly state: HitItemSaveState
  readonly fieldError: HitItemFormErrorCode | ShopContactFormErrorCode | null
  /** Erro geral do último salvar (chave i18n completa); `null` quando não há ou foi de um campo. */
  readonly errorKey: string | null
  readonly message: ShopContactMessage | null
  readonly startCreate: () => void
  readonly startEdit: (id: string) => void
  readonly cancel: () => void
  readonly change: (patch: Partial<HitItemForm>) => void
  readonly changeContact: (patch: Partial<ShopContactForm>) => void
  readonly choosePhoto: (file: File) => Promise<void>
  readonly save: () => Promise<void>
  readonly archive: (id: string) => Promise<void>
  readonly unarchive: (id: string) => Promise<void>
}

export interface HitPhotoControl {
  /** A foto reduzida, pronta para enviar; `null` enquanto ninguém escolheu uma nova. */
  readonly upload: Ref<ShopPhotoUpload | null>
  /** A mesma foto como URL de prévia. */
  readonly pendingUrl: ComputedRef<string | null>
  /** `false` quando o navegador não conseguiu abrir a imagem. */
  readonly choose: (file: File) => Promise<boolean>
  readonly clear: () => void
}
