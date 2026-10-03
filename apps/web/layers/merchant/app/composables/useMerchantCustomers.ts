import type { CustomerFilter, MerchantCustomerRow } from '#shared/schemas/customer'
import type { TransportError } from '#shared/types/errors'
import type { AsyncResultState } from '#layers/core/app/types/asyncResult'

export interface MerchantCustomers {
  filter: Ref<CustomerFilter>
  state: ComputedRef<AsyncResultState<MerchantCustomerRow[], TransportError>>
  reload: () => Promise<void>
}

export function useMerchantCustomers(initial: CustomerFilter = 'all'): MerchantCustomers {
  const { customers } = useMerchantServices()
  const filter = ref<CustomerFilter>(initial)
  const { state, reload } = useAsyncResult(() => customers.listCustomers(filter.value))
  watch(filter, () => void reload())
  return { filter, state, reload }
}
