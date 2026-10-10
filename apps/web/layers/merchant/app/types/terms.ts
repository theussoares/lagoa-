import type { ComputedRef, Ref } from 'vue'
import type { MerchantTermsError } from '../services/MerchantTermsService'

export type MerchantTermsAcceptState =
  | { status: 'idle' }
  | { status: 'accepting' }
  | { status: 'error'; code: MerchantTermsError['code'] }

export interface MerchantTerms {
  /** A loja da sessão ainda não aceitou a versão atual. */
  needed: ComputedRef<boolean>
  state: Ref<MerchantTermsAcceptState>
  accept: () => Promise<void>
}
