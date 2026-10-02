import { CustomerFilterSchema } from '#shared/schemas/customer'
import type { CustomerFilter } from '#shared/schemas/customer'

/** `/clientes?filtro=sumidos`: o Início leva direto à lista filtrada. */
export const CUSTOMER_FILTER_QUERY = 'filtro'

const slugByFilter: Readonly<Record<CustomerFilter, string>> = {
  all: 'todos',
  lapsed: 'sumidos',
  rewardReady: 'premio-liberado',
}

export function customerFilterSlug(filter: CustomerFilter): string {
  return slugByFilter[filter]
}

export function customerFilterFromSlug(value: unknown): CustomerFilter {
  return CustomerFilterSchema.options.find((filter) => slugByFilter[filter] === value) ?? 'all'
}
