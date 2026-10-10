import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import { useMerchantSessionStore } from '../stores/merchantSession'
import type { MerchantTerms, MerchantTermsAcceptState } from '../types/terms'

/** Aceite do termo do lojista no Início: grava no servidor e libera a sessão na memória. */
export function useMerchantTerms(onAccepted: () => Promise<void>): MerchantTerms {
  const { terms } = useMerchantServices()
  const sessions = useMerchantSessionStore()
  const { expire } = useMerchantSession()
  const state = ref<MerchantTermsAcceptState>({ status: 'idle' })

  async function accept(): Promise<void> {
    if (state.value.status === 'accepting') return
    state.value = { status: 'accepting' }
    const result = await terms.accept(MERCHANT_TERMS_VERSION)
    if (result.ok) {
      sessions.markTermsAccepted()
      state.value = { status: 'idle' }
      await onAccepted()
      return
    }
    if (result.error.code === 'unauthorized') return expire()
    state.value = { status: 'error', code: result.error.code }
  }

  return { needed: computed(() => sessions.merchant?.termsAccepted === false), state, accept }
}
