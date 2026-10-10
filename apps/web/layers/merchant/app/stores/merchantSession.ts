import type { MerchantSession } from '#shared/schemas/session'
import type { ShopStatus } from '#shared/schemas/shop'

/**
 * Sessão do lojista. Não persiste em lugar nenhum do navegador: quem vale é o cookie httpOnly do BFF.
 * `checked` diz se já perguntamos ao servidor (`GET /api/merchant/session`); `withoutShop` é o celular confirmado
 * que ainda não criou o clube.
 */
export const useMerchantSessionStore = defineStore('merchantSession', () => {
  const merchant = ref<MerchantSession | null>(null)
  const checked = ref(false)
  const withoutShop = ref(false)

  function startMerchant(session: MerchantSession): void {
    merchant.value = session
    withoutShop.value = false
    checked.value = true
  }

  function startWithoutShop(): void {
    merchant.value = null
    withoutShop.value = true
    checked.value = true
  }

  /** A rede aprova ou suspende a loja com o lojista logado: a sessão acompanha o servidor. */
  function updateMerchantShopStatus(status: ShopStatus): void {
    if (merchant.value === null || merchant.value.shopStatus === status) return
    merchant.value = { ...merchant.value, shopStatus: status }
  }

  function markTermsAccepted(): void {
    if (merchant.value === null || merchant.value.termsAccepted) return
    merchant.value = { ...merchant.value, termsAccepted: true }
  }

  function endMerchant(): void {
    merchant.value = null
    withoutShop.value = false
    checked.value = true
  }

  return { merchant, checked, withoutShop, startMerchant, startWithoutShop, updateMerchantShopStatus, markTermsAccepted, endMerchant }
})
