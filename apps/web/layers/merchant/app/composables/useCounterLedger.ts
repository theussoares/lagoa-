import type { CounterEntry } from '#shared/schemas/visit'
import type { TransportError } from '#shared/types/errors'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'

export interface CounterLedger {
  state: ComputedRef<AsyncResultState<CounterEntry[], TransportError>>
  /** Linhas lançadas nesta tela: entram com a batida do carimbo. */
  freshIds: Readonly<Ref<ReadonlySet<string>>>
  reload: () => Promise<void>
  prepend: (entry: CounterEntry) => void
}

export function useCounterLedger(): CounterLedger {
  const { counter } = useMerchantServices()
  const { state, reload, set } = useAsyncResult(() => counter.listTodayEntries())
  const freshIds = shallowRef<ReadonlySet<string>>(new Set())

  function prepend(entry: CounterEntry): void {
    freshIds.value = new Set([...freshIds.value, entry.id])
    const current = state.value.status === 'success' ? state.value.value : []
    set([entry, ...current.filter((item) => item.id !== entry.id)])
  }

  return { state, freshIds, reload, prepend }
}
