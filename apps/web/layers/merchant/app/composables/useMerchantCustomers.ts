import type { CustomerFilter } from '#shared/schemas/customer'
import type { TransportError } from '#shared/types/errors'
import type { MerchantCustomers } from '../types/customer'

/** Primeira página ao abrir e a cada troca de filtro; "Carregar mais" junta a próxima ao fim da lista. */
export function useMerchantCustomers(initial: CustomerFilter = 'all'): MerchantCustomers {
  const { customers } = useMerchantServices()
  const filter = ref<CustomerFilter>(initial)
  const loadingMore = ref(false)
  const loadMoreError = ref<TransportError | null>(null)
  const { state, reload, set } = useAsyncResult(() => customers.listCustomers(filter.value))

  async function loadMore(): Promise<void> {
    const current = state.value
    if (current.status !== 'success' || current.value.nextCursor === null || loadingMore.value) return
    const requestedFor = filter.value
    loadingMore.value = true
    loadMoreError.value = null
    const next = await customers.listCustomers(requestedFor, current.value.nextCursor)
    loadingMore.value = false
    // Filtro trocado (ou lista recarregada) no meio do caminho: esta página já não pertence à lista da tela.
    if (filter.value !== requestedFor || state.value !== current) return
    if (!next.ok) {
      loadMoreError.value = next.error
      return
    }
    set({ ...next.value, items: [...current.value.items, ...next.value.items] })
  }

  watch(filter, () => {
    loadMoreError.value = null
    void reload()
  })
  return { filter, state, reload, loadMore, loadingMore, loadMoreError }
}
