import type { ComputedRef } from 'vue'
import type { MerchantSession } from '#shared/schemas/session'
import type { ShopStatus } from '#shared/schemas/shop'

/** O que o servidor diz de quem abriu o painel. `noShop` = celular confirmado que ainda não criou o clube. */
export type MerchantAccess = { status: 'shop'; session: MerchantSession } | { status: 'noShop' } | { status: 'signedOut' }

export interface MerchantSessionControl {
  session: ComputedRef<MerchantSession | null>
  start: (session: MerchantSession) => void
  startWithoutShop: () => void
  /** Pergunta ao servidor uma vez e guarda; as próximas leituras vêm da memória. */
  check: () => Promise<MerchantAccess>
  /** Sai no servidor e só então deixa o painel; se o servidor não confirmar, avisa e mantém a sessão. */
  signOut: () => Promise<void>
  /** Esquece a sessão local e vai para o login, sem falar com o servidor (ele já recusou a sessão). */
  expire: () => Promise<void>
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
