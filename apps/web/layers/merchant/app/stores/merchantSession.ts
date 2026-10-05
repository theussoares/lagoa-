import type { MerchantSession } from '#shared/schemas/session'
import type { ShopStatus } from '#shared/schemas/shop'
import { readStoredMerchantSession, writeStoredMerchantSession } from '../utils/merchantSessionPersistence'

/** Sessão do lojista (painel só no navegador, com o mock até a API existir): vive no localStorage, nunca no SSR. */
export const useMerchantSessionStore = defineStore('merchantSession', () => {
  const merchant = ref<MerchantSession | null>(import.meta.client ? readStoredMerchantSession(window.localStorage) : null)

  function persist(): void {
    if (import.meta.client) writeStoredMerchantSession(window.localStorage, merchant.value)
  }

  function startMerchant(session: MerchantSession): void {
    merchant.value = session
    persist()
  }

  /** A rede aprova ou suspende a loja com o lojista logado: a sessão acompanha o servidor. */
  function updateMerchantShopStatus(status: ShopStatus): void {
    if (merchant.value === null || merchant.value.shopStatus === status) return
    merchant.value = { ...merchant.value, shopStatus: status }
    persist()
  }

  function endMerchant(): void {
    merchant.value = null
    persist()
  }

  return { merchant, startMerchant, updateMerchantShopStatus, endMerchant }
})
