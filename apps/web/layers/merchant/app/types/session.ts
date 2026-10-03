import type { ComputedRef } from 'vue'
import type { MerchantSession } from '#shared/schemas/session'
import type { ShopStatus } from '#shared/schemas/shop'

export interface MerchantSessionControl {
  session: ComputedRef<MerchantSession | null>
  start: (session: MerchantSession) => void
  signOut: () => Promise<void>
}

export interface MerchantSessionGuardOptions {
  /** Loja fechada pela rede (`shopPendingApproval` | `shopSuspended`) relê a situação da loja. */
  refreshShopStatus?: boolean
}

export interface ShopStatusSync {
  status: ComputedRef<ShopStatus | null>
  /** Relê a situação da loja no servidor e atualiza a sessão guardada. */
  refresh: () => Promise<void>
  /** Atalho de teste do mock (o admin aprova); `null` fora do mock. */
  approveForTesting: (() => Promise<boolean>) | null
}
