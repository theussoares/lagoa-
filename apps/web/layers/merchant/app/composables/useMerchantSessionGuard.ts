import { errorCodeOf } from '#layers/core/app/utils/errorCode'
import type { ErrorCarrier } from '#layers/core/app/types/error'
import type { MerchantSessionGuardOptions } from '../types/session'

const SHOP_CLOSED_CODES = ['shopPendingApproval', 'shopSuspended']

/**
 * Sessão vencida em qualquer fonte leva de volta ao login do painel; loja fechada pela rede
 * atualiza a faixa do painel, sem derrubar a sessão. `unauthorized` tem precedência.
 */
export function useMerchantSessionGuard(
  source: () => readonly ErrorCarrier[],
  options: MerchantSessionGuardOptions = {},
): void {
  const { signOut } = useMerchantSession()
  const shopStatus = useShopStatus()

  watch(
    () => source().map(errorCodeOf),
    (codes) => {
      if (codes.includes('unauthorized')) {
        void signOut()
        return
      }
      if (options.refreshShopStatus !== true) return
      if (codes.some((code) => code !== null && SHOP_CLOSED_CODES.includes(code))) void shopStatus.refresh()
    },
  )
}
