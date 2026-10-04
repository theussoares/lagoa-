import { z } from 'zod'
import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { AccountService } from '../AccountService'

export class HttpAccountService implements AccountService {
  constructor(private readonly api: ApiClient) {}

  async eraseAccount() {
    return transportOnly(await this.api.delete('/customer/account', z.undefined()))
  }
}
