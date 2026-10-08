import type { TransportError } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { MerchantHomeSnapshot, MerchantHome } from '../types/home'

export function useMerchantHome(): MerchantHome {
  const { home, customers, campaigns, posterReprint: posterReprintService } = useMerchantServices()
  const { state, reload } = useAsyncResult(async (): Promise<Result<MerchantHomeSnapshot, TransportError>> => {
    const [week, lapsed, overview, reprint] = await Promise.all([
      home.getWeekSummary(),
      customers.listCustomers('lapsed'),
      campaigns.getOverview(),
      posterReprintService.isPending(),
    ])
    if (!week.ok) return week
    if (!lapsed.ok) return lapsed
    // Sessão vencida derruba a tela; qualquer outra falha da contagem só esconde aquela linha.
    if (!overview.ok && overview.error.code === 'unauthorized') return err(overview.error)
    return ok({
      week: week.value,
      lapsed: lapsed.value,
      reachable: overview.ok ? overview.value.reach.reachable : null,
      posterReprintPending: reprint.ok && reprint.value,
    })
  })
  return { state, reload, posterReprint: usePosterReprint(reload) }
}
