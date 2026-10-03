import { formatLongWeekdayDate } from '#shared/utils/dateFormat'
import type { CounterFocusTarget, CounterScreen } from '../types/counter'

/** Balcão: orquestra dados, guarda de sessão e foco; a página só compõe os componentes. */
export function useCounterScreen(): CounterScreen {
  const { program: programService } = useMerchantServices()
  const program = useAsyncResult(() => programService.getProgram())
  const ledger = useCounterLedger()
  const launch = useCounterLaunch()
  const redemption = useRedemptionCheck()
  const { request, focus } = useFocusRequest<CounterFocusTarget>()

  useMerchantSessionGuard(() => [program.state.value, ledger.state.value, launch.state.value, redemption.state.value], {
    refreshShopStatus: true,
  })

  onMounted(() => focus('phone'))

  return reactive({
    today: formatLongWeekdayDate(new Date()),
    focusRequest: request,
    launch: useCounterLaunchForm(program, launch, ledger, focus),
    redemption: useCounterRedemptionView(redemption, ledger, focus),
    ledger: useCounterLedgerView(ledger),
  })
}
