import type { ShopContactUpdate, ShopPublicContact } from '#shared/schemas/shop'
import type { ShopContactError } from '../services/ShopContactService'

export type ShopContactKind = ShopPublicContact['kind']

/** O que a pessoa digitou na tela "Botão do card": só os campos do modo escolhido valem ao salvar. */
export interface ShopContactForm {
  readonly kind: ShopContactKind
  /** Formatado, "(67) 99123-4567". */
  readonly whatsapp: string
  readonly message: string
  readonly url: string
  readonly ctaLabel: string
}

export type ShopContactFormErrorCode = 'invalidWhatsapp' | 'invalidUrl' | 'missingLabel'

export type ShopContactUpdateResult =
  | { readonly ok: true; readonly update: ShopContactUpdate }
  | { readonly ok: false; readonly code: ShopContactFormErrorCode }

/** O botão como vai aparecer no card (sem texto vazio: o WhatsApp cai no texto padrão). */
export interface ShopContactPreview {
  readonly label: string
  readonly icon: string
  readonly href: string
}

export type ShopContactSaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'saved' }
  | { readonly status: 'removed' }
  | { readonly status: 'error'; readonly code: ShopContactError['code'] | ShopContactFormErrorCode }

export interface ShopContactMessage {
  readonly tone: 'success' | 'error'
  /** Chave i18n já completa. */
  readonly key: string
}

/** Retorno de `useShopLinkScreen`: um `reactive`, então a página lê direto, sem `.value`. */
export interface ShopLinkScreen {
  readonly loading: boolean
  readonly form: ShopContactForm
  /** A loja já tem um botão salvo (habilita "Tirar o botão"). */
  readonly hasSaved: boolean
  readonly preview: ShopContactPreview | null
  readonly state: ShopContactSaveState
  /** Erro de campo da última tentativa de salvar (o resto aparece como mensagem de estado). */
  readonly fieldError: ShopContactFormErrorCode | null
  /** Resultado da última ação, com o tom; `null` enquanto não há o que dizer. */
  readonly message: ShopContactMessage | null
  readonly change: (patch: Partial<ShopContactForm>) => void
  readonly save: () => Promise<void>
  readonly remove: () => Promise<void>
}
