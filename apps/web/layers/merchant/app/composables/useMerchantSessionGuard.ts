import { hasErrorCode } from '#layers/core/app/utils/errorCode'
import type { DomainErrorCode } from '#shared/types/errors'
import type { ErrorCarrier } from '#layers/core/app/types/error'
import type { MerchantSessionGuardOptions } from '../types/session'

const SHOP_CLOSED_CODES: readonly DomainErrorCode[] = ['shopPendingApproval', 'shopSuspended']

/**
 * Sessão vencida em qualquer fonte leva de volta ao login do painel; loja fechada pela rede
 * atualiza a faixa do painel, sem derrubar a sessão. `unauthorized` tem precedência.
 */
export function useMerchantSessionGuard(
  source: () => readonly ErrorCarrier[],
  options: MerchantSessionGuardOptions = {},
): void {
  const { expire } = useMerchantSession()
  const shopStatus = useShopStatus()

  watch(
    // Array novo a cada leitura: reavalia a cada mudança de qualquer fonte, como o Balcão fazia.
    () => [...source()],
    (states) => {
      if (hasErrorCode(states, ['unauthorized'])) {
        void expire()
        return
      }
      if (options.refreshShopStatus !== true) return
      if (hasErrorCode(states, SHOP_CLOSED_CODES)) void shopStatus.refresh()
    },
  )
}
