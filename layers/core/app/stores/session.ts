import type { CustomerSession, MerchantSession } from '#shared/schemas/session'
import type { ShopStatus } from '#shared/schemas/shop'
import { readStoredSessions, writeStoredSessions } from '../utils/sessionPersistence'

export const useSessionStore = defineStore('session', () => {
  const stored = readStoredSessions(window.localStorage)
  const customer = ref<CustomerSession | null>(stored.customer)
  const merchant = ref<MerchantSession | null>(stored.merchant)

  function persist(): void {
    writeStoredSessions(window.localStorage, { customer: customer.value, merchant: merchant.value })
  }

  function startCustomer(session: CustomerSession): void {
    customer.value = session
    persist()
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

  function endCustomer(): void {
    customer.value = null
    persist()
  }

  function endMerchant(): void {
    merchant.value = null
    persist()
  }

  return { customer, merchant, startCustomer, startMerchant, updateMerchantShopStatus, endCustomer, endMerchant }
})
