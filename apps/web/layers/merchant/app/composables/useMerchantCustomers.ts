import type { CustomerFilter } from '#shared/schemas/customer'
import type { MerchantCustomers } from '../types/customer'

export function useMerchantCustomers(initial: CustomerFilter = 'all'): MerchantCustomers {
  const { customers } = useMerchantServices()
  const filter = ref<CustomerFilter>(initial)
  const { state, reload } = useAsyncResult(() => customers.listCustomers(filter.value))
  watch(filter, () => void reload())
  return { filter, state, reload }
}
