import type { CounterEntry } from '#shared/schemas/visit'
import type { CounterLedger } from '../types/counter'

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
