import { useSessionStore } from '#layers/core/app/stores/session'
import type { ShopStatus } from '#shared/schemas/shop'

export interface ShopStatusSync {
  status: ComputedRef<ShopStatus | null>
  /** Relê a situação da loja no servidor e atualiza a sessão guardada. */
  refresh: () => Promise<void>
  /** Atalho de teste do mock (o admin aprova); `null` fora do mock. */
  approveForTesting: (() => Promise<boolean>) | null
}

/** A sessão guarda a situação da loja do login; o servidor é quem sabe se ela mudou. */
export function useShopStatus(): ShopStatusSync {
  const { shopStatus, shopApprovalTesting } = useMerchantServices()
  const sessions = useSessionStore()

  async function refresh(): Promise<void> {
    if (sessions.merchant === null) return
    const result = await shopStatus.getStatus()
    if (result.ok) sessions.updateMerchantShopStatus(result.value)
  }

  const approveForTesting =
    shopApprovalTesting === null
      ? null
      : async (): Promise<boolean> => {
          const result = await shopApprovalTesting.approveCurrentShop()
          if (result.ok) sessions.updateMerchantShopStatus(result.value)
          return result.ok
        }

  return { status: computed(() => sessions.merchant?.shopStatus ?? null), refresh, approveForTesting }
}
