import { z } from 'zod'
import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { ok, type Result } from '#shared/types/result'
import type { MerchantTermsError, MerchantTermsService } from '../MerchantTermsService'

const AcceptedSchema = z.object({ version: z.string() })

export class HttpMerchantTermsService implements MerchantTermsService {
  constructor(private readonly api: ApiClient) {}

  async accept(version: string): Promise<Result<void, MerchantTermsError>> {
    const res = allowing('merchantTermsNotAccepted', 'notFound')(
      await this.api.post('/merchant/shop/terms/accept', AcceptedSchema, { body: { version } }),
    )
    return res.ok ? ok(undefined) : res
  }
}
