import type { MerchantCustomerRow } from '#shared/schemas/customer'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { TransportError } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'

export interface MerchantHomeSnapshot {
  readonly week: WeekSummary
  /** Sumidos mais recentes primeiro: são os mais fáceis de trazer de volta. */
  readonly lapsed: readonly MerchantCustomerRow[]
  /**
   * Quantos podem receber um lembrete agora (regra do servidor, a mesma de Campanhas).
   * `null` quando a contagem não veio: o resto do Início continua de pé.
   */
  readonly reachable: number | null
}

export interface MerchantHome {
  state: ComputedRef<AsyncResultState<MerchantHomeSnapshot, TransportError>>
  reload: () => Promise<void>
}

export function useMerchantHome(): MerchantHome {
  const { home, customers, campaigns } = useMerchantServices()
  const { state, reload } = useAsyncResult(async (): Promise<Result<MerchantHomeSnapshot, TransportError>> => {
    const [week, lapsed, overview] = await Promise.all([
      home.getWeekSummary(),
      customers.listCustomers('lapsed'),
      campaigns.getOverview(),
    ])
    if (!week.ok) return week
    if (!lapsed.ok) return lapsed
    // Sessão vencida derruba a tela; qualquer outra falha da contagem só esconde aquela linha.
    if (!overview.ok && overview.error.code === 'unauthorized') return err(overview.error)
    return ok({ week: week.value, lapsed: lapsed.value, reachable: overview.ok ? overview.value.reach.reachable : null })
  })
  return { state, reload }
}
