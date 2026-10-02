import type { CustomerFilter, MerchantCustomerRow } from '#shared/schemas/customer'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface MerchantCustomersService {
  /** Celular sempre mascarado; não existe método que devolva o número completo. */
  listCustomers(filter: CustomerFilter): Promise<Result<MerchantCustomerRow[], TransportError>>
}
