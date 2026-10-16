import type { TransportError } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { MerchantHomeSnapshot, MerchantHome } from '../types/home'

export function useMerchantHome(): MerchantHome {
  const { home, customers, campaigns, program: programService, posterReprint: posterReprintService } = useMerchantServices()
  const campaignsEnabled = useCampaignsEnabled()
  const { state, reload } = useAsyncResult(async (): Promise<Result<MerchantHomeSnapshot, TransportError>> => {
    const [week, lapsed, allCustomers, readyCustomers, programResult, overview, reprint] = await Promise.all([
      home.getWeekSummary(),
      customers.listCustomers('lapsed'),
      customers.listCustomers('all'),
      customers.listCustomers('rewardReady'),
      programService.getProgram(),
      campaignsEnabled ? campaigns.getOverview() : Promise.resolve(null),
      posterReprintService.isPending(),
    ])
    if (!week.ok) return week
    if (!lapsed.ok) return lapsed
    // Sessão vencida derruba a tela; qualquer outra falha só esconde aquela seção.
    if (overview !== null && !overview.ok && overview.error.code === 'unauthorized') return err(overview.error)
    if (allCustomers !== null && !allCustomers.ok && allCustomers.error.code === 'unauthorized') return err(allCustomers.error)
    if (readyCustomers !== null && !readyCustomers.ok && readyCustomers.error.code === 'unauthorized') return err(readyCustomers.error)
    if (programResult !== null && !programResult.ok && programResult.error.code === 'unauthorized') return err(programResult.error)

    return ok({
      week: week.value,
      lapsed: lapsed.value,
      allCustomers: allCustomers?.ok ? allCustomers.value : null,
      readyCustomers: readyCustomers?.ok ? readyCustomers.value : null,
      program: programResult?.ok ? programResult.value : null,
      campaignsOverview: overview?.ok ? overview.value : null,
      reachable: overview?.ok ? overview.value.reach.reachable : null,
      posterReprintPending: reprint.ok && reprint.value,
    })
  })
  return { state, reload, posterReprint: usePosterReprint(reload) }
}
