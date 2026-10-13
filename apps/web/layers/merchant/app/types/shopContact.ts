import type { ComputedRef, Ref, WritableComputedRef } from 'vue'
import type { ShopContactError } from '../services/ShopContactService'

export type ShopContactSaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'saved' }
  | { readonly status: 'error'; readonly code: ShopContactError['code'] | 'invalidWhatsapp' }

export interface ShopContactControl {
  readonly loading: ComputedRef<boolean>
  /** O que está no campo: formatado, "(67) 99123-4567". */
  readonly whatsapp: WritableComputedRef<string>
  readonly ctaLabel: WritableComputedRef<string>
  readonly state: Ref<ShopContactSaveState>
  readonly save: () => Promise<void>
}
