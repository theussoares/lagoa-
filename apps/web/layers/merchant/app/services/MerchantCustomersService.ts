import type { CustomerFilter, MerchantCustomerPage } from '#shared/schemas/customer'
import type { CustomerId } from '#shared/schemas/ids'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface MerchantCustomersService {
  /**
   * Uma página (a primeira sem `cursor`; a seguinte com o `nextCursor` da anterior). Celular sempre mascarado; não
   * existe método que devolva o número completo.
   */
  listCustomers(filter: CustomerFilter, cursor?: CustomerId | null): Promise<Result<MerchantCustomerPage, TransportError>>
}
