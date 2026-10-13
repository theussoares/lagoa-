import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { MerchantCustomerPageSchema, type CustomerFilter } from '#shared/schemas/customer'
import type { CustomerId } from '#shared/schemas/ids'
import type { MerchantCustomersService } from '../MerchantCustomersService'

export class HttpMerchantCustomersService implements MerchantCustomersService {
  constructor(private readonly api: ApiClient) {}

  async listCustomers(filter: CustomerFilter, cursor: CustomerId | null = null) {
    const search = new URLSearchParams({ filter })
    if (cursor !== null) search.set('cursor', cursor)
    return transportOnly(await this.api.get(`/merchant/customers?${search.toString()}`, MerchantCustomerPageSchema))
  }
}
