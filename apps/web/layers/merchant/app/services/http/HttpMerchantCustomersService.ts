import { z } from 'zod'
import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { MerchantCustomerRowSchema, type CustomerFilter } from '#shared/schemas/customer'
import type { MerchantCustomersService } from '../MerchantCustomersService'

export class HttpMerchantCustomersService implements MerchantCustomersService {
  constructor(private readonly api: ApiClient) {}

  async listCustomers(filter: CustomerFilter) {
    return transportOnly(
      await this.api.get(`/merchant/customers?filter=${encodeURIComponent(filter)}`, z.array(MerchantCustomerRowSchema)),
    )
  }
}
